#!/usr/bin/env python3
"""生成文章索引预览 HTML 页面，用于快速扫读知识库内容。"""
import os, re, json
from datetime import datetime

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(SITE_ROOT, "content", "articles")

# Concept display names
CONCEPT_NAMES = {
    'dsl': '领域特定语言 (DSL)',
    'geo': 'GEO 搜索引擎优化',
    'harness-engineer': 'Harness 工程化',
    'llm-wiki': 'LLM 知识体系',
    'loop-engineering': 'Loop Engineering',
    'prompt-engineer': '提示词工程',
}

def parse_frontmatter(content):
    fm = {}
    if not content.startswith('---'):
        return fm, content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return fm, content
    fm_text = parts[1].strip()
    for line in fm_text.split('\n'):
        line = line.strip()
        if ':' in line and not line.startswith('#'):
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip()
            if val.startswith('[') and val.endswith(']'):
                val = val[1:-1]
                items = [item.strip().strip("'\"") for item in val.split(',') if item.strip()]
                fm[key] = items
            else:
                fm[key] = val
    return fm, parts[2].strip()


def extract_preview(body, max_len=200):
    """从正文提取前 N 字符的纯文本预览。"""
    text = re.sub(r'```[\s\S]*?```', '', body)
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
    text = text.strip()
    preview = text[:max_len].replace('\n', ' ').strip()
    if len(text) > max_len:
        preview += '...'
    return preview


TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>文章索引预览 — 冲量 AI 知识库</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; border-radius: 12px; margin-bottom: 30px; }
header h1 { font-size: 28px; margin-bottom: 8px; }
header p { opacity: 0.8; font-size: 14px; }
.stats { display: flex; gap: 20px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
.stat { background: rgba(255,255,255,0.1); padding: 8px 20px; border-radius: 8px; font-size: 14px; }
.stat strong { color: #e94560; font-size: 20px; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.filter-bar button { padding: 6px 16px; border: 1px solid #ddd; background: white; border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.filter-bar button:hover { border-color: #e94560; color: #e94560; }
.filter-bar button.active { background: #e94560; color: white; border-color: #e94560; }
.filter-bar .label { font-size: 13px; color: #999; margin-right: 8px; }
.articles { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #eee; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.card.featured { border-left: 4px solid #e94560; }
.card h3 { font-size: 16px; margin-bottom: 8px; line-height: 1.4; }
.card h3 a { color: #1a1a2e; text-decoration: none; }
.card h3 a:hover { color: #e94560; }
.card .desc { font-size: 13px; color: #666; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card .preview { font-size: 12px; color: #999; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-style: italic; }
.card .meta { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; padding: 2px 8px; background: #f0f0f0; border-radius: 4px; color: #666; }
.tag.concept { background: #fff3e0; color: #e65100; }
footer { text-align: center; padding: 30px; color: #999; font-size: 13px; }
</style>
</head>
<body>
<div class="container">
<header>
<h1>📚 冲量 AI 知识库 — 文章索引</h1>
<p>AI 产品经理入门知识库 · 内容预览总览</p>
<div class="stats">
<span class="stat"><strong>__N_ARTICLES__</strong> 篇文章</span>
<span class="stat"><strong>__N_CONCEPTS__</strong> 个概念分类</span>
<span class="stat"><strong>__N_TAGS__</strong> 个标签</span>
</div>
</header>
<div class="filter-bar"><span class="label">筛选：</span>
__FILTER_BUTTONS__
</div>
<div class="articles" id="articlesGrid">
__CARDS__
</div>
<script>
function filterConcept(c) {
document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
event.target.classList.add('active');
document.querySelectorAll('.card').forEach(card => {
if (!c || card.dataset.concepts.includes(c)) {
card.style.display = '';
} else {
card.style.display = 'none';
}
});
}
</script>
<footer>生成时间：__TIMESTAMP__ · 冲量 AI 知识库内容预览</footer>
</div>
</body>
</html>"""


def main():
    articles = []
    for f in sorted(os.listdir(ARTICLES_DIR)):
        if not f.endswith('.md') or f in ('README.md', 'template.md'):
            continue
        with open(os.path.join(ARTICLES_DIR, f), 'r', encoding='utf-8') as fh:
            content = fh.read()

        fm, body = parse_frontmatter(content)
        slug = fm.get('slug', f.replace('.md', ''))
        title = fm.get('title', slug)
        description = fm.get('description', '')
        tags = fm.get('tags', [])
        concepts = fm.get('concepts', [])
        featured = fm.get('featured', 'false') == 'true'

        if not isinstance(tags, list):
            tags = [tags] if tags else []
        if not isinstance(concepts, list):
            concepts = [concepts] if concepts else []

        short_desc = description[:150] + '...' if len(description) > 150 else description
        preview = extract_preview(body)

        articles.append({
            'slug': slug,
            'title': title,
            'description': short_desc,
            'preview': preview,
            'tags': tags,
            'concepts': concepts,
            'featured': featured,
            'url': 'https://chongliang.ai/articles/{}/'.format(slug),
        })

    # Stats
    all_concepts = set(c for a in articles for c in a['concepts'])
    all_tags = set(t for a in articles for t in a['tags'])

    # Build HTML
    cards_html = []
    for a in articles:
        featured_class = ' featured' if a['featured'] else ''
        concepts_html = ' '.join(
            '<span class="tag concept">{}</span>'.format(CONCEPT_NAMES.get(c, c))
            for c in a['concepts']
        )
        tags_html = ' '.join(
            '<span class="tag">{}</span>'.format(t)
            for t in a['tags'][:4]
        )
        data_concepts = ' '.join(a['concepts'])
        # Escape for HTML
        title_esc = a['title'].replace('"', '&quot;')
        desc_esc = a['description'].replace('<', '&lt;').replace('>', '&gt;')
        preview_esc = a['preview'].replace('<', '&lt;').replace('>', '&gt;')

        card = (
            '<div class="card{}" data-concepts="{}">'
            '<h3><a href="{}" target="_blank">{}</a></h3>'
            '<div class="desc">{}</div>'
            '<div class="preview">{}</div>'
            '<div class="meta">{} {}</div>'
            '</div>'
        ).format(featured_class, data_concepts, a['url'], title_esc, desc_esc, preview_esc, concepts_html, tags_html)
        cards_html.append(card)

    # Filter buttons
    filter_buttons = ['<button class="active" onclick="filterConcept(\'\')">全部</button>']
    for c in sorted(CONCEPT_NAMES.keys()):
        count = sum(1 for a in articles if c in a['concepts'])
        filter_buttons.append(
            '<button onclick="filterConcept(\'{}\')">{} ({})</button>'.format(c, CONCEPT_NAMES[c], count)
        )

    html = TEMPLATE.replace('__N_ARTICLES__', str(len(articles))) \
                   .replace('__N_CONCEPTS__', str(len(all_concepts))) \
                   .replace('__N_TAGS__', str(len(all_tags))) \
                   .replace('__FILTER_BUTTONS__', '\n'.join(filter_buttons)) \
                   .replace('__CARDS__', '\n'.join(cards_html)) \
                   .replace('__TIMESTAMP__', datetime.now().strftime('%Y-%m-%d %H:%M'))

    output_path = os.path.join(SITE_ROOT, "article-index-preview.html")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print("Generated: {}".format(output_path))
    print("File size: {} bytes".format(len(html)))
    print("Articles indexed: {}".format(len(articles)))


if __name__ == '__main__':
    main()
