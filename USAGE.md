# 冲量 AI 网站使用说明

这套网站的使用方式可以理解成：

```text
你维护 content/ 数据
        ↓
生成器自动生成 HTML、互链、SEO/GEO 文件
        ↓
GitHub Pages 自动部署
```

## 你日常只做三件事

### 1. 上传文章

在 GitHub 仓库里进入：

```text
content/articles/
```

复制 `template.md`，新建一个 Markdown 文件，例如：

```text
content/articles/my-new-article.md
```

填好 frontmatter 和正文。最重要的是：

```yaml
title: 文章标题
slug: my-new-article
date: 2026-07-05
updated: 2026-07-05
description: 文章摘要
tags: [AI, 知识库]
concepts: [prompt-engineer, geo]
```

提交到 GitHub 后，网站会自动生成：

- `articles/my-new-article/index.html`
- 文章列表卡片
- 文章到知识点的互链
- sitemap、feed、llms、GEO 索引

### 2. 上传知识点

在 GitHub 仓库里进入：

```text
content/concepts/
```

复制 `template.md`，新建一个知识点文件，例如：

```text
content/concepts/evaluation-harness.md
```

重点填这些字段：

```yaml
title: Evaluation Harness 是什么
slug: evaluation-harness
term: Evaluation Harness
summary: 一句话解释
definition: 正式定义
citation: 可被 AI 引用的短摘要
relatedConcepts: [harness-engineer, prompt-engineer]
relatedArticles: [ai-public-knowledge-system]
```

提交后，网站会自动生成知识点详情页，并出现在知识库索引和知识原点树里。

### 3. 维护项目

编辑：

```text
content/projects.json
```

新增项目对象即可。以后你给我 GitHub 仓库列表，我可以继续帮你把项目字段整理好。

## 本地预览

如果你想在本地预览：

```bash
npm run build
npm run preview
```

然后打开：

```text
http://localhost:4173
```

## GitHub Pages 部署

1. 在 GitHub 新建仓库，例如 `chongliang-ai-site`。
2. 把本目录所有文件上传到仓库根目录。
3. 进入仓库 `Settings → Pages`。
4. Source 选择 `GitHub Actions`。
5. 在 GitHub 网页里新建 `.github/workflows/deploy.yml`，内容复制根目录的 `deploy-workflow-template.yml`。
6. 以后每次 push 到 `main` 分支，会自动部署。

如果你的 GitHub token 有 `workflow` 权限，也可以直接把 `deploy-workflow-template.yml` 移到 `.github/workflows/deploy.yml` 后提交。

## 绑定域名

等你域名确定后，需要做三件事：

1. 在 `content/site.json` 里把 `siteUrl` 改成正式域名。
2. 在仓库根目录增加 `CNAME` 文件，内容就是你的域名，例如：

```text
chongliang.ai
```

3. 运行或等待 GitHub Actions 自动重新部署。

## 你不用手改的东西

正常情况下，你不需要手改这些文件：

- `articles/`
- `knowledge/`
- `projects/`
- `sitemap.xml`
- `feed.xml`
- `llms.txt`
- `llms-full.txt`
- `search-index.json`
- `geo-index.json`

这些都是生成器产物。你改 `content/`，它们会自动更新。

## 后续我怎么继续帮你迭代

你的内容越多，我可以继续基于数据帮你做三类迭代：

- UI/GUI：根据文章、知识点、项目数量调整首页、列表页、知识库布局。
- SEO：优化标题、摘要、结构化数据、内链、sitemap、RSS。
- GEO：优化概念定义、引用摘要、llms 文件、AI 检索索引和知识图谱结构。
