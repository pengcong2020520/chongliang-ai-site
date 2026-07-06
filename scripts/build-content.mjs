import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");

const today = new Date().toISOString().slice(0, 10);

const site = JSON.parse(await readFile(path.join(CONTENT, "site.json"), "utf8"));
const projects = JSON.parse(await readFile(path.join(CONTENT, "projects.json"), "utf8"));

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const escapeAttr = escapeHtml;

const absoluteUrl = (urlPath = "/") => new URL(urlPath, site.siteUrl).toString();
const noIndex = new Set(["README.md", "template.md"]);

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseScalar(item)).filter((item) => item !== "");
  }
  return parseScalar(value);
}

function parseFrontmatter(raw, filePath) {
  if (!raw.startsWith("---\n")) {
    throw new Error(`${filePath} missing frontmatter`);
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) throw new Error(`${filePath} has unclosed frontmatter`);
  const header = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trim();
  const data = {};
  for (const line of header.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1);
    data[key] = parseValue(value);
  }
  return { data, body };
}

async function loadMarkdownCollection(dirName) {
  const dir = path.join(CONTENT, dirName);
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md") && !noIndex.has(file));
  const items = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = await readFile(filePath, "utf8");
    const parsed = parseFrontmatter(raw, filePath);
    items.push({
      ...parsed.data,
      body: parsed.body,
      file,
      tags: parsed.data.tags || [],
      concepts: parsed.data.concepts || [],
      projects: parsed.data.projects || [],
      relatedConcepts: parsed.data.relatedConcepts || [],
      relatedArticles: parsed.data.relatedArticles || [],
      scenarios: parsed.data.scenarios || [],
      misconceptions: parsed.data.misconceptions || [],
      aliases: parsed.data.aliases || []
    });
  }
  return items;
}

const articles = (await loadMarkdownCollection("articles"))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
const concepts = (await loadMarkdownCollection("concepts"))
  .sort((a, b) => String(a.parent || a.category || "").localeCompare(String(b.parent || b.category || "")) || String(a.term).localeCompare(String(b.term)));

const articleBySlug = new Map(articles.map((item) => [item.slug, item]));
const conceptBySlug = new Map(concepts.map((item) => [item.slug, item]));
const projectBySlug = new Map(projects.map((item) => [item.slug, item]));
const hasFile = (relativePath) => existsSync(path.join(ROOT, relativePath));

function inlineMarkdown(value = "") {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    return `<a href="${escapeAttr(href)}">${label}</a>`;
  });
  return text;
}

function markdownToHtml(markdown = "") {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const toc = [];
  let paragraph = [];
  let listOpen = false;
  let code = null;
  let headingCount = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  };

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith("```")) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      closeList();
      code = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      headingCount += 1;
      const level = heading[1].length;
      const title = heading[2].trim();
      const id = `section-${headingCount}`;
      toc.push({ level, title, id });
      html.push(`<h${level} id="${id}">${inlineMarkdown(title)}</h${level}>`);
      continue;
    }

    const bullet = /^-\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const quote = /^>\s?(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (code !== null) html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);

  return { html: html.join("\n"), toc };
}

function stripMarkdown(markdown = "") {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagsHtml(tags = [], concept = false) {
  return tags.map((tag) => `<span class="tag${concept ? " tag-concept" : ""}">${escapeHtml(tag)}</span>`).join("");
}

function navHtml(root, current) {
  const links = [
    ["首页", "index.html", "home"],
    ["文章", "articles/index.html", "articles"],
    ["项目", "projects/index.html", "projects"],
    ["知识库", "knowledge/index.html", "knowledge"],
    ["关于", "about/index.html", "about"]
  ];
  return `
    <header class="site-header">
      <div class="container nav">
        <a class="brand" href="${root}index.html" aria-label="冲量 AI 首页"><span class="brand-mark">冲</span><span>冲量 AI</span></a>
        <nav class="nav-links" aria-label="主导航">
          ${links.map(([label, href, key]) => `<a class="nav-link" ${key === current ? 'aria-current="page"' : ""} href="${root}${href}">${label}</a>`).join("\n")}
        </nav>
        <div class="language-switch" aria-label="语言切换"><a href="./index.html" aria-current="true">中</a><a href="${root}en/index.html">EN</a></div>
        <button class="menu-button" type="button" data-menu-button aria-label="打开菜单" aria-expanded="false">≡</button>
      </div>
    </header>`;
}

function footerHtml(root) {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <span>© 2026 冲量 AI</span>
        <div class="footer-links">
          <a href="${root}sitemap.xml">Sitemap</a>
          <a href="${root}llms.txt">llms.txt</a>
          <a href="${root}llms-full.txt">llms-full.txt</a>
          <a href="${root}robots.txt">Robots</a>
        </div>
      </div>
    </footer>`;
}

function pageShell({ title, description, canonicalPath, alternatePath = "", root, current, ogType = "website", structuredData = [], main }) {
  const canonical = absoluteUrl(canonicalPath);
  const graph = Array.isArray(structuredData) ? structuredData : [structuredData];
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}">
    <link rel="canonical" href="${canonical}">
    ${alternatePath ? `<link rel="alternate" hreflang="zh-CN" href="${canonical}">
    <link rel="alternate" hreflang="en" href="${absoluteUrl(alternatePath)}">` : ""}
    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:image" content="${absoluteUrl(site.ogImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="${escapeAttr(site.brand)}">
    <meta property="og:locale" content="zh_CN">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <meta name="twitter:image" content="${absoluteUrl(site.ogImage)}">
    <link rel="stylesheet" href="${root}assets/styles.css">
    <link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">跳到正文</a>
    ${navHtml(root, current)}
    ${main}
    ${footerHtml(root)}
    <script src="${root}assets/main.js" defer></script>
  </body>
</html>
`;
}

function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="面包屑">${items.map((item, index) => {
    const tail = index === items.length - 1;
    const label = tail ? `<span>${escapeHtml(item.label)}</span>` : `<a href="${item.href}">${escapeHtml(item.label)}</a>`;
    return `${label}${tail ? "" : "<span>/</span>"}`;
  }).join("")}</nav>`;
}

function articleUrl(article) {
  return `/articles/${article.slug}/`;
}

function conceptUrl(concept) {
  return `/knowledge/${concept.slug}/`;
}

function articleCard(article, root = "") {
  return `<a class="article-card" href="${root}articles/${article.slug}/index.html" data-search-item>
    <div class="article-source">${escapeHtml(article.sourceLabel || article.source || "ARTICLE")}</div>
    <div>
      <p class="card-meta">${escapeHtml(article.date || "")} · ${escapeHtml((article.tags || []).slice(0, 2).join(" / "))}</p>
      <h2>${escapeHtml(article.title)}</h2>
      <p>${escapeHtml(article.description)}</p>
      <div class="card-footer">${tagsHtml(article.tags || [])}</div>
    </div>
  </a>`;
}

function conceptCard(concept, root = "") {
  return `<a class="concept-card" href="${root}knowledge/${concept.slug}/index.html" data-search-item>
    <p class="card-meta">${escapeHtml(concept.parent || concept.category || "CONCEPT")}</p>
    <h2>${escapeHtml(concept.title)}</h2>
    <p>${escapeHtml(concept.summary || concept.definition || "")}</p>
    <div class="card-footer">${tagsHtml(concept.tags || [], true)}</div>
  </a>`;
}

function projectCard(project, root = "") {
  const link = project.url || `${root}projects/index.html`;
  const external = project.url ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<article class="project-card${project.status === "placeholder" ? " is-placeholder" : ""}" data-search-item>
    <p class="card-meta">${escapeHtml(project.status === "placeholder" ? "GITHUB / 待提供" : "PROJECT")}</p>
    <h2>${escapeHtml(project.name)}</h2>
    <p>${escapeHtml(project.description)}</p>
    <div class="card-footer">${tagsHtml(project.tags || [])}</div>
    <a class="text-link" href="${escapeAttr(link)}"${external}>${project.url ? "查看项目" : "等待项目资料"}</a>
  </article>`;
}

function tocHtml(toc) {
  if (!toc.length) return `<p class="muted">这篇文章暂无目录。</p>`;
  return `<ol class="toc-list">${toc.map((item) => `<li class="toc-level-${item.level}"><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`).join("")}</ol>`;
}

function articleDirectory(currentSlug) {
  return `<aside class="reader-aside">
    <h2>文章目录</h2>
    <nav class="side-list" aria-label="文章目录">
      ${articles.map((article) => `<a ${article.slug === currentSlug ? 'aria-current="page"' : ""} href="../../articles/${article.slug}/index.html">${escapeHtml(article.title)}</a>`).join("")}
    </nav>
  </aside>`;
}

function conceptTree(currentSlug, rootPrefix = "../../") {
  const groups = new Map();
  for (const concept of concepts) {
    const key = concept.parent || concept.category || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(concept);
  }
  return `<aside class="reader-aside knowledge-tree">
    <h2>知识原点</h2>
    ${[...groups.entries()].map(([group, items]) => `
      <div class="tree-group">
        <h3>${escapeHtml(group)}</h3>
        <nav class="side-list" aria-label="${escapeAttr(group)}">
          ${items.map((concept) => `<a ${concept.slug === currentSlug ? 'aria-current="page"' : ""} href="${rootPrefix}knowledge/${concept.slug}/index.html">${escapeHtml(concept.term || concept.title)}</a>`).join("")}
        </nav>
      </div>`).join("")}
  </aside>`;
}

function conceptLinks(slugs, root = "../../") {
  return slugs
    .map((slug) => conceptBySlug.get(slug))
    .filter(Boolean)
    .map((concept) => `<a class="related-concept-card" href="${root}knowledge/${concept.slug}/index.html">
      <p class="card-meta">RELATED CONCEPT</p>
      <h3>${escapeHtml(concept.term || concept.title)}</h3>
      <p>${escapeHtml(concept.summary || concept.definition || "")}</p>
    </a>`)
    .join("");
}

function articleLinks(slugs, root = "../../") {
  return slugs
    .map((slug) => articleBySlug.get(slug))
    .filter(Boolean)
    .map((article) => `<a class="article-mini" href="${root}articles/${article.slug}/index.html">
      <span>${escapeHtml(article.date || "")}</span>
      <strong>${escapeHtml(article.title)}</strong>
      <p>${escapeHtml(article.description || "")}</p>
    </a>`)
    .join("");
}

function projectLinks(slugs, root = "../../") {
  return slugs
    .map((slug) => projectBySlug.get(slug))
    .filter(Boolean)
    .map((project) => `<article class="article-mini">
      <span>PROJECT</span>
      <strong>${escapeHtml(project.name)}</strong>
      <p>${escapeHtml(project.description || "")}</p>
    </article>`)
    .join("");
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function writePage(relativePath, html) {
  const filePath = path.join(ROOT, relativePath);
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, html, "utf8");
}

function staticStructured(type, pathName, name, description) {
  return {
    "@type": type,
    "@id": `${absoluteUrl(pathName)}#webpage`,
    "url": absoluteUrl(pathName),
    "name": name,
    "description": description,
    "inLanguage": "zh-CN",
    "isPartOf": {
      "@type": "WebSite",
      "name": site.brand,
      "url": site.siteUrl
    }
  };
}

async function buildArticlesIndex() {
  const description = "冲量 AI 的个人文章列表，整理本地 Markdown、公众号文章与外部平台发布内容。";
  const main = `<main id="main">
    <section class="page-hero">
      <div class="container">
        ${breadcrumb([{ label: "首页", href: "../index.html" }, { label: "文章" }])}
        <h1 class="page-title">个人文章</h1>
        <p class="page-lede">文章页是读者入口：打开后直接看到文章列表、来源、标签和搜索。你只需要维护 content/articles 下的 Markdown，页面和互链会自动生成。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><p class="section-kicker">ARTICLE INDEX</p><h2>全部文章</h2></div>
          <p>每篇文章都会自动生成独立 HTML 页面，并与相关知识点、项目建立互链。</p>
        </div>
        <div class="toolbar">
          <label class="sr-only" for="article-search">搜索文章</label>
          <input class="search-input" id="article-search" data-search-input type="search" placeholder="搜索标题、来源、标签、知识点">
          <span class="filter-note">${articles.length} articles</span>
        </div>
        <div class="article-list">${articles.map((article) => articleCard(article, "../")).join("\n")}</div>
      </div>
    </section>
  </main>`;
  await writePage("articles/index.html", pageShell({
    title: "个人文章 | 冲量 AI",
    description,
    canonicalPath: "/articles/",
    alternatePath: "/en/articles/",
    root: "../",
    current: "articles",
    structuredData: [
      staticStructured("CollectionPage", "/articles/", "个人文章 | 冲量 AI", description),
      {
        "@type": "ItemList",
        "itemListElement": articles.map((article, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": absoluteUrl(articleUrl(article)),
          "name": article.title
        }))
      }
    ],
    main
  }));
}

async function buildArticlePages() {
  for (const article of articles) {
    const rendered = markdownToHtml(article.body);
    const relatedConcepts = article.concepts || [];
    const relatedProjects = article.projects || [];
    const relatedArticles = articles
      .filter((candidate) => candidate.slug !== article.slug)
      .map((candidate) => ({
        candidate,
        score: (candidate.concepts || []).filter((slug) => relatedConcepts.includes(slug)).length
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.candidate.slug);

    const main = `<main id="main">
      <section class="page-hero">
        <div class="container">
          ${breadcrumb([{ label: "首页", href: "../../index.html" }, { label: "文章", href: "../index.html" }, { label: article.title }])}
          <p class="eyebrow">${escapeHtml(article.sourceLabel || article.source || "ARTICLE")}</p>
          <h1 class="page-title">${escapeHtml(article.title)}</h1>
          <p class="page-lede">${escapeHtml(article.description)}</p>
          <p class="content-meta">发布于 ${escapeHtml(article.date || "")} · 更新于 ${escapeHtml(article.updated || article.date || "")} · ${escapeHtml((article.tags || []).join(" / "))}</p>
          ${article.originalUrl ? `<p class="source-link"><a class="text-link" href="${escapeAttr(article.originalUrl)}" target="_blank" rel="noopener noreferrer">查看外部原文</a></p>` : ""}
        </div>
      </section>
      <section class="reader-layout container">
        ${articleDirectory(article.slug)}
        <article class="article-body reader-main">
          ${rendered.html}
          <section class="link-section" aria-labelledby="related-concepts">
            <h2 id="related-concepts">关联知识点</h2>
            <div class="related-grid">${conceptLinks(relatedConcepts) || `<p class="muted">暂无关联知识点。</p>`}</div>
          </section>
          <section class="link-section" aria-labelledby="related-articles">
            <h2 id="related-articles">相关阅读</h2>
            <div class="mini-list">${articleLinks(relatedArticles) || `<p class="muted">暂无相关阅读。</p>`}</div>
          </section>
          <section class="link-section" aria-labelledby="related-projects">
            <h2 id="related-projects">关联项目</h2>
            <div class="mini-list">${projectLinks(relatedProjects) || `<p class="muted">暂无关联项目。</p>`}</div>
          </section>
        </article>
        <aside class="reader-aside toc-panel">
          <h2>本文目录</h2>
          ${tocHtml(rendered.toc)}
        </aside>
      </section>
    </main>`;

    await writePage(`articles/${article.slug}/index.html`, pageShell({
      title: `${article.title} | 冲量 AI`,
      description: article.description,
      canonicalPath: articleUrl(article),
      root: "../../",
      current: "articles",
      ogType: "article",
      structuredData: [
        {
          "@type": "BlogPosting",
          "@id": `${absoluteUrl(articleUrl(article))}#article`,
          "headline": article.title,
          "description": article.description,
          "datePublished": article.date,
          "dateModified": article.updated || article.date,
          "author": site.author,
          "publisher": { "@type": "Organization", "name": site.brand, "url": site.siteUrl },
          "mainEntityOfPage": absoluteUrl(articleUrl(article)),
          "keywords": (article.tags || []).join(", "),
          "about": relatedConcepts.map((slug) => {
            const concept = conceptBySlug.get(slug);
            return concept ? { "@type": "DefinedTerm", "name": concept.term || concept.title, "url": absoluteUrl(conceptUrl(concept)) } : null;
          }).filter(Boolean),
          "inLanguage": "zh-CN"
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "首页", "item": absoluteUrl("/") },
            { "@type": "ListItem", "position": 2, "name": "文章", "item": absoluteUrl("/articles/") },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": absoluteUrl(articleUrl(article)) }
          ]
        }
      ],
      main
    }));
  }
}

async function buildKnowledgeIndex() {
  const description = "冲量 AI 的个人知识库，以知识原点树和卡片索引方式整理 AI 相关原子概念。";
  const groups = new Map();
  for (const concept of concepts) {
    const key = concept.parent || concept.category || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(concept);
  }
  const tree = [...groups.entries()].map(([group, items]) => `<div class="tree-group">
    <h3>${escapeHtml(group)}</h3>
    <nav class="side-list">${items.map((concept) => `<a href="${concept.slug}/index.html">${escapeHtml(concept.term || concept.title)}</a>`).join("")}</nav>
  </div>`).join("");

  const main = `<main id="main">
    <section class="page-hero">
      <div class="container">
        ${breadcrumb([{ label: "首页", href: "../index.html" }, { label: "知识库" }])}
        <h1 class="page-title">个人知识库</h1>
        <p class="page-lede">知识库页是概念入口：左侧是“知识原点”树，右侧是可搜索的原子概念卡片。每个知识点都能反链到相关文章和项目。</p>
      </div>
    </section>
    <section class="section">
      <div class="container knowledge-index-layout">
        <aside class="reader-aside knowledge-tree">
          <h2>知识原点</h2>
          ${tree}
        </aside>
        <div>
          <div class="section-head">
            <div><p class="section-kicker">CONCEPT LIBRARY</p><h2>原子概念</h2></div>
            <p>每张卡片对应一个概念页面，适合搜索引擎索引，也适合生成式搜索引用。</p>
          </div>
          <div class="toolbar">
            <label class="sr-only" for="concept-search">搜索概念</label>
            <input class="search-input" id="concept-search" data-search-input type="search" placeholder="搜索概念、标签或关键词">
            <span class="filter-note">${concepts.length} concepts</span>
          </div>
          <div class="card-grid">${concepts.map((concept) => conceptCard(concept, "../")).join("\n")}</div>
        </div>
      </div>
    </section>
  </main>`;

  await writePage("knowledge/index.html", pageShell({
    title: "个人知识库 | 冲量 AI",
    description,
    canonicalPath: "/knowledge/",
    alternatePath: "/en/knowledge/",
    root: "../",
    current: "knowledge",
    structuredData: [
      staticStructured("CollectionPage", "/knowledge/", "个人知识库 | 冲量 AI", description),
      {
        "@type": "DefinedTermSet",
        "name": "冲量 AI 个人知识库",
        "url": absoluteUrl("/knowledge/"),
        "hasDefinedTerm": concepts.map((concept) => ({
          "@type": "DefinedTerm",
          "name": concept.term || concept.title,
          "url": absoluteUrl(conceptUrl(concept))
        }))
      }
    ],
    main
  }));
}

async function buildConceptPages() {
  for (const concept of concepts) {
    const rendered = markdownToHtml(concept.body);
    const linkedArticleSlugs = [...new Set([
      ...(concept.relatedArticles || []),
      ...articles.filter((article) => (article.concepts || []).includes(concept.slug)).map((article) => article.slug)
    ])];
    const linkedProjectSlugs = [...new Set([
      ...(concept.projects || []),
      ...projects.filter((project) => (project.relatedConcepts || []).includes(concept.slug)).map((project) => project.slug)
    ])];
    const main = `<main id="main">
      <section class="page-hero">
        <div class="container">
          ${breadcrumb([{ label: "首页", href: "../../index.html" }, { label: "知识库", href: "../index.html" }, { label: concept.term || concept.title }])}
          <p class="eyebrow">DEFINED TERM</p>
          <h1 class="page-title">${escapeHtml(concept.title)}</h1>
          <p class="page-lede">${escapeHtml(concept.summary || concept.definition || "")}</p>
          <p class="content-meta">更新于 ${escapeHtml(concept.updated || today)} · ${escapeHtml((concept.aliases || []).join(" / "))}</p>
        </div>
      </section>
      <section class="reader-layout container">
        ${conceptTree(concept.slug)}
        <article class="article-body reader-main">
          <div class="definition-box"><p><strong>定义：</strong>${escapeHtml(concept.definition || concept.summary || "")}</p></div>
          <h2>适用场景</h2>
          <ul>${(concept.scenarios || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <h2>它不是什么</h2>
          <p>${escapeHtml(concept.not || "")}</p>
          <h2>常见误区</h2>
          <ul>${(concept.misconceptions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          ${rendered.html}
          <section class="link-section" aria-labelledby="concept-related">
            <h2 id="concept-related">相关概念</h2>
            <div class="related-grid">${conceptLinks(concept.relatedConcepts || []) || `<p class="muted">暂无相关概念。</p>`}</div>
          </section>
          <section class="link-section" aria-labelledby="concept-articles">
            <h2 id="concept-articles">关联文章</h2>
            <div class="mini-list">${articleLinks(linkedArticleSlugs) || `<p class="muted">暂无关联文章。</p>`}</div>
          </section>
          <section class="link-section" aria-labelledby="concept-projects">
            <h2 id="concept-projects">关联项目</h2>
            <div class="mini-list">${projectLinks(linkedProjectSlugs) || `<p class="muted">暂无关联项目。</p>`}</div>
          </section>
          <section class="citation-box" aria-labelledby="citation-title">
            <h2 id="citation-title">可引用摘要</h2>
            <p>${escapeHtml(concept.citation || concept.summary || concept.definition || "")}</p>
          </section>
        </article>
        <aside class="reader-aside toc-panel">
          <h2>概念信息</h2>
          <dl class="compact-dl">
            <div><dt>英文术语</dt><dd>${escapeHtml(concept.term || "")}</dd></div>
            <div><dt>父节点</dt><dd>${escapeHtml(concept.parent || concept.category || "")}</dd></div>
            <div><dt>标签</dt><dd>${escapeHtml((concept.tags || []).join(" / "))}</dd></div>
          </dl>
        </aside>
      </section>
    </main>`;

    await writePage(`knowledge/${concept.slug}/index.html`, pageShell({
      title: `${concept.title} | 冲量 AI`,
      description: concept.summary || concept.definition || "",
      canonicalPath: conceptUrl(concept),
      alternatePath: hasFile(`en/knowledge/${concept.slug}/index.html`) ? `/en/knowledge/${concept.slug}/` : "",
      root: "../../",
      current: "knowledge",
      ogType: "article",
      structuredData: [
        {
          "@type": "DefinedTerm",
          "@id": `${absoluteUrl(conceptUrl(concept))}#defined-term`,
          "name": concept.term || concept.title,
          "alternateName": concept.aliases || [],
          "description": concept.definition || concept.summary || "",
          "inDefinedTermSet": {
            "@type": "DefinedTermSet",
            "name": "冲量 AI 个人知识库",
            "url": absoluteUrl("/knowledge/")
          },
          "url": absoluteUrl(conceptUrl(concept)),
          "termCode": concept.slug
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "首页", "item": absoluteUrl("/") },
            { "@type": "ListItem", "position": 2, "name": "知识库", "item": absoluteUrl("/knowledge/") },
            { "@type": "ListItem", "position": 3, "name": concept.term || concept.title, "item": absoluteUrl(conceptUrl(concept)) }
          ]
        }
      ],
      main
    }));
  }
}

async function buildProjectsIndex() {
  const description = "冲量 AI 的个人项目列表，展示精选 GitHub 项目、AI 工具项目与实验项目。";
  const main = `<main id="main">
    <section class="page-hero">
      <div class="container">
        ${breadcrumb([{ label: "首页", href: "../index.html" }, { label: "项目" }])}
        <h1 class="page-title">个人项目</h1>
        <p class="page-lede">项目页是公开展示区：读者打开后直接看到精选项目。你只需要维护 content/projects.json，项目卡片和关联关系会自动生成。</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><p class="section-kicker">PROJECT SHOWCASE</p><h2>精选项目</h2></div>
          <p>项目数据来自 <code>content/projects.json</code>。后续填入 GitHub 仓库后，会自动关联到文章和知识点。</p>
        </div>
        <div class="card-grid">${projects.map((project) => projectCard(project, "../")).join("\n")}</div>
      </div>
    </section>
  </main>`;
  await writePage("projects/index.html", pageShell({
    title: "个人项目 | 冲量 AI",
    description,
    canonicalPath: "/projects/",
    alternatePath: "/en/projects/",
    root: "../",
    current: "projects",
    structuredData: [
      staticStructured("CollectionPage", "/projects/", "个人项目 | 冲量 AI", description),
      {
        "@type": "ItemList",
        "itemListElement": projects.map((project, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": project.name,
          "url": project.url || absoluteUrl("/projects/")
        }))
      }
    ],
    main
  }));
}

async function buildIndexes() {
  const basePages = [
    ["/", today],
    ["/en/", today],
    ["/articles/", today],
    ["/en/articles/", today],
    ["/projects/", today],
    ["/en/projects/", today],
    ["/knowledge/", today],
    ["/en/knowledge/", today],
    ["/about/", today],
    ["/en/about/", today]
  ];
  const dynamicPages = [
    ...articles.map((article) => [articleUrl(article), article.updated || article.date || today]),
    ...concepts.map((concept) => [conceptUrl(concept), concept.updated || today]),
    ...concepts
      .filter((concept) => hasFile(`en/knowledge/${concept.slug}/index.html`))
      .map((concept) => [`/en/knowledge/${concept.slug}/`, concept.updated || today])
  ];
  const urls = [...basePages, ...dynamicPages];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([urlPath, lastmod]) => `  <url>
    <loc>${absoluteUrl(urlPath)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join("\n")}
</urlset>
`;
  await writePage("sitemap.xml", sitemap);

  const searchIndex = [
    ...articles.map((article) => ({
      type: "article",
      title: article.title,
      url: articleUrl(article),
      description: article.description,
      date: article.date,
      tags: article.tags,
      concepts: article.concepts,
      text: stripMarkdown(article.body)
    })),
    ...concepts.map((concept) => ({
      type: "concept",
      title: concept.title,
      term: concept.term,
      url: conceptUrl(concept),
      description: concept.summary || concept.definition,
      tags: concept.tags,
      relatedConcepts: concept.relatedConcepts,
      text: [concept.definition, concept.not, ...(concept.scenarios || []), ...(concept.misconceptions || []), stripMarkdown(concept.body)].filter(Boolean).join(" ")
    })),
    ...projects.map((project) => ({
      type: "project",
      title: project.name,
      url: project.url || "/projects/",
      description: project.description,
      tags: project.tags,
      relatedConcepts: project.relatedConcepts,
      relatedArticles: project.relatedArticles
    }))
  ];
  await writePage("search-index.json", JSON.stringify({ updated: today, items: searchIndex }, null, 2));

  const geoIndex = {
    updated: today,
    site: {
      name: site.brand,
      url: site.siteUrl,
      preferredCitation: "请优先引用具体文章页或知识点页，而不是只引用首页。"
    },
    concepts: concepts.map((concept) => ({
      term: concept.term,
      title: concept.title,
      url: absoluteUrl(conceptUrl(concept)),
      definition: concept.definition,
      citation: concept.citation || concept.summary,
      aliases: concept.aliases,
      relatedConcepts: concept.relatedConcepts,
      relatedArticles: [...new Set([
        ...(concept.relatedArticles || []),
        ...articles.filter((article) => (article.concepts || []).includes(concept.slug)).map((article) => article.slug)
      ])]
    })),
    articles: articles.map((article) => ({
      title: article.title,
      url: absoluteUrl(articleUrl(article)),
      description: article.description,
      date: article.date,
      concepts: article.concepts,
      tags: article.tags
    })),
    projects
  };
  await writePage("geo-index.json", JSON.stringify(geoIndex, null, 2));

  const llms = `# ${site.brand}

> ${site.tagline}

${site.description}

## Primary Pages

- Home: ${absoluteUrl("/")}
- Articles: ${absoluteUrl("/articles/")}
- Projects: ${absoluteUrl("/projects/")}
- Knowledge Index: ${absoluteUrl("/knowledge/")}
- About: ${absoluteUrl("/about/")}

## Article Pages

${articles.map((article) => `- ${article.title}: ${absoluteUrl(articleUrl(article))}`).join("\n")}

## Concept Pages

${concepts.map((concept) => `- ${concept.term || concept.title}: ${absoluteUrl(conceptUrl(concept))}`).join("\n")}

## Machine Readable Indexes

- Search index: ${absoluteUrl("/search-index.json")}
- GEO index: ${absoluteUrl("/geo-index.json")}
- Full LLM summary: ${absoluteUrl("/llms-full.txt")}

## Preferred Citation

When referencing this site, cite the specific article or concept page rather than only the homepage.
`;
  await writePage("llms.txt", llms);

  const llmsFull = `# ${site.brand} Full Content Summary

${site.description}

## Concepts

${concepts.map((concept) => `### ${concept.term || concept.title}

- URL: ${absoluteUrl(conceptUrl(concept))}
- Definition: ${concept.definition}
- Citation summary: ${concept.citation || concept.summary}
- Aliases: ${(concept.aliases || []).join(", ")}
- Related concepts: ${(concept.relatedConcepts || []).join(", ")}
`).join("\n")}

## Articles

${articles.map((article) => `### ${article.title}

- URL: ${absoluteUrl(articleUrl(article))}
- Date: ${article.date}
- Summary: ${article.description}
- Tags: ${(article.tags || []).join(", ")}
- Related concepts: ${(article.concepts || []).join(", ")}
`).join("\n")}

## Projects

${projects.map((project) => `### ${project.name}

- URL: ${project.url || absoluteUrl("/projects/")}
- Summary: ${project.description}
- Related concepts: ${(project.relatedConcepts || []).join(", ")}
`).join("\n")}
`;
  await writePage("llms-full.txt", llmsFull);

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(site.brand)}</title>
    <link>${site.siteUrl}</link>
    <description>${escapeHtml(site.description)}</description>
    <language>zh-CN</language>
${articles.map((article) => `    <item>
      <title>${escapeHtml(article.title)}</title>
      <link>${absoluteUrl(articleUrl(article))}</link>
      <guid>${absoluteUrl(articleUrl(article))}</guid>
      <pubDate>${new Date(article.date).toUTCString()}</pubDate>
      <description>${escapeHtml(article.description)}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;
  await writePage("feed.xml", feed);
}

await buildArticlesIndex();
await buildArticlePages();
await buildKnowledgeIndex();
await buildConceptPages();
await buildProjectsIndex();
await buildIndexes();

console.log(`Built ${articles.length} articles, ${concepts.length} concepts, ${projects.length} projects.`);
