#!/usr/bin/env python3
"""
Sync vault articles to chongliang-ai-site article format.

Usage:
    python3 sync-vault.py <vault_file_path> <target_slug> [--featured] [--hot]

Reads a vault markdown file (with vault-style frontmatter), converts it to
the site's article format, and writes to content/articles/{slug}.md.
"""

import sys
import os
import re
import argparse


SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(SITE_ROOT, "content", "articles")

# Articles that should be featured/hot
FEATURED_SLUGS = {
    "loop-engineering-paradigm-shift",
    "harness-engineer-structural-replacement",
    "saas-disrupted-by-ai-agent",
}

# Concept mapping: keyword patterns -> concept slug
CONCEPT_RULES = [
    ("loop-engineering", ["loop engineering", "loop-engineering", "agent loop", "循环工程", "循环系统"]),
    ("harness-engineer", ["harness engineer", "harness-engineer", "harness engineering"]),
    ("prompt-engineer", ["prompt engineer", "prompt-engineer", "prompt engineering"]),
    ("dsl", ["dsl", "domain specific language", "skill", "cli化", "cli"]),
    ("geo", ["geo", "geographic", "地理"]),
    ("llm-wiki", ["llm wiki", "知识库", "wiki"]),
]


def parse_vault_frontmatter(content: str):
    """Parse vault frontmatter (between --- markers) and return (frontmatter_dict, body)."""
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    fm_text = parts[1].strip()
    body = parts[2].lstrip("\n")

    fm = {}
    for line in fm_text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            # Parse list values like [a, b, c]
            if val.startswith("[") and val.endswith("]"):
                val = val[1:-1]
                items = [item.strip().strip("'\"") for item in val.split(",") if item.strip()]
                fm[key] = items
            else:
                fm[key] = val

    return fm, body


def extract_title(body: str) -> str:
    """Extract title from the first # heading."""
    for line in body.split("\n"):
        line = line.rstrip()
        if line.startswith("# ") and not line.startswith("## "):
            return line[2:].strip()
    return "Untitled"


def extract_description(body: str) -> str:
    """Extract description from '> 本文摘要：' line or first paragraph."""
    for line in body.split("\n"):
        stripped = line.strip()
        if stripped.startswith("> 本文摘要：") or stripped.startswith("> 本文摘要:"):
            desc = stripped.replace("> 本文摘要：", "").replace("> 本文摘要:", "").strip()
            # Trim to 80-140 chars
            if len(desc) > 140:
                # Try to cut at a sentence boundary
                cut = desc[:140]
                # Try to find last period or comma
                for sep in ["。", "；", "，"]:
                    idx = cut.rfind(sep)
                    if idx > 80:
                        return cut[:idx + 1]
                return cut
            return desc

    # Fallback: first non-empty, non-heading paragraph
    paragraphs = body.split("\n\n")
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith("#") and not p.startswith("|") and not p.startswith("```"):
            # Clean markdown
            p = re.sub(r'[*_`#>]', '', p).strip()
            if len(p) > 140:
                cut = p[:140]
                for sep in ["。", "；", "，"]:
                    idx = cut.rfind(sep)
                    if idx > 80:
                        return cut[:idx + 1]
                return cut
            return p

    return "本文探讨了AI工程领域的核心议题。"


def clean_tags(vault_tags) -> list:
    """Clean up vault tags for site format."""
    if not vault_tags:
        return ["AI", "知识沉淀"]
    
    if isinstance(vault_tags, str):
        # Parse string list
        vault_tags = vault_tags.strip("[]")
        vault_tags = [t.strip().strip("'\"") for t in vault_tags.split(",")]
    
    cleaned = []
    for tag in vault_tags:
        tag = tag.strip()
        if not tag:
            continue
        cleaned.append(tag)
    
    if not cleaned:
        return ["AI", "知识沉淀"]
    
    return cleaned[:5]  # Max 5 tags


def map_concepts(tags: list, title: str, body: str) -> list:
    """Map tags and content to existing concept slugs."""
    combined = " ".join(tags).lower() + " " + title.lower() + " " + body[:2000].lower()
    concepts = []
    for concept_slug, keywords in CONCEPT_RULES:
        for kw in keywords:
            if kw.lower() in combined:
                if concept_slug not in concepts:
                    concepts.append(concept_slug)
                break
    return concepts if concepts else []


def clean_body(body: str) -> str:
    """Clean body: remove 本文摘要 line and other summary blockquotes, ensure first ## is 核心结论."""
    lines = body.split("\n")
    cleaned = []
    in_summary_blockquote = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Remove 本文摘要 line and any immediately following blockquote lines
        if stripped.startswith("> 本文摘要：") or stripped.startswith("> 本文摘要:"):
            in_summary_blockquote = True
            continue
        # Also remove "> 本文是..." style summary blockquotes (series intro)
        if stripped.startswith("> 本文是") and ("系列" in stripped or "摘要" in stripped):
            in_summary_blockquote = True
            continue

        # Skip continuation of the summary blockquote
        if in_summary_blockquote:
            if stripped.startswith(">"):
                continue
            else:
                in_summary_blockquote = False
                # Skip blank line right after the blockquote
                if stripped == "":
                    continue

        cleaned.append(line)

    body_text = "\n".join(cleaned)

    # Remove leading blank lines
    body_text = body_text.lstrip("\n")

    # Ensure first ## heading is 核心结论
    # Find the first ## heading
    lines = body_text.split("\n")
    first_h2_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("## "):
            first_h2_idx = i
            break

    if first_h2_idx is not None:
        first_h2 = lines[first_h2_idx].strip()
        # Check if it's already 核心结论
        if "核心结论" not in first_h2 and "收束" not in first_h2:
            # Rename the first ## to ## 核心结论
            lines[first_h2_idx] = "## 核心结论"
        elif "收束" in first_h2:
            lines[first_h2_idx] = "## 核心结论"
        body_text = "\n".join(lines)
    else:
        # No ## headings found, add one
        body_text = "## 核心结论\n\n" + body_text

    # Clean up multiple consecutive blank lines
    body_text = re.sub(r'\n{3,}', '\n\n', body_text)

    return body_text.strip() + "\n"


def generate_frontmatter(title: str, slug: str, description: str, tags: list,
                         concepts: list, date: str, featured: bool, hot: bool) -> str:
    """Generate site-format frontmatter."""
    # Format tags as YAML inline list
    tags_yaml = "[" + ", ".join(tags) + "]"
    concepts_yaml = "[" + ", ".join(concepts) + "]" if concepts else "[]"

    fm = f"""---
type: article
title: {title}
slug: {slug}
date: {date}
updated: {date}
description: {description}
source: local
sourceLabel: LOCAL MD
originalUrl:
tags: {tags_yaml}
concepts: {concepts_yaml}
projects: []
featured: {str(featured).lower()}
hot: {str(hot).lower()}
language: zh-CN
---"""
    return fm


def convert_article(vault_path: str, slug: str, date: str = "2026-07-06") -> dict:
    """Convert a vault article to site format and write it."""
    with open(vault_path, "r", encoding="utf-8") as f:
        raw_content = f.read()

    fm, body = parse_vault_frontmatter(raw_content)
    title = extract_title(body)
    description = extract_description(body)
    tags = clean_tags(fm.get("标签", []))
    concepts = map_concepts(tags, title, body)
    featured = slug in FEATURED_SLUGS
    hot = featured

    # Remove the # title line from body (it becomes the title in frontmatter)
    body_lines = body.split("\n")
    body_without_title = []
    title_removed = False
    for line in body_lines:
        if not title_removed and line.strip().startswith("# ") and not line.strip().startswith("## "):
            title_removed = True
            continue
        body_without_title.append(line)
    body = "\n".join(body_without_title)

    body = clean_body(body)

    frontmatter = generate_frontmatter(
        title=title,
        slug=slug,
        description=description,
        tags=tags,
        concepts=concepts,
        date=date,
        featured=featured,
        hot=hot,
    )

    output = frontmatter + "\n\n" + body

    # Ensure articles directory exists
    os.makedirs(ARTICLES_DIR, exist_ok=True)

    output_path = os.path.join(ARTICLES_DIR, f"{slug}.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(output)

    return {
        "slug": slug,
        "title": title,
        "path": output_path,
        "description": description,
        "tags": tags,
        "concepts": concepts,
        "featured": featured,
        "hot": hot,
    }


def main():
    parser = argparse.ArgumentParser(description="Sync vault article to site format")
    parser.add_argument("vault_path", help="Path to vault markdown file")
    parser.add_argument("slug", help="Target slug for the article")
    parser.add_argument("--date", default="2026-07-06", help="Date for the article (YYYY-MM-DD)")

    args = parser.parse_args()

    if not os.path.exists(args.vault_path):
        print(f"Error: File not found: {args.vault_path}", file=sys.stderr)
        sys.exit(1)

    result = convert_article(args.vault_path, args.slug, args.date)

    print(f"✅ Converted: {result['title']}")
    print(f"   Slug: {result['slug']}")
    print(f"   Path: {result['path']}")
    print(f"   Tags: {result['tags']}")
    print(f"   Concepts: {result['concepts']}")
    print(f"   Featured: {result['featured']}, Hot: {result['hot']}")
    print(f"   Description: {result['description'][:80]}...")


if __name__ == "__main__":
    main()
