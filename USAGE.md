# 冲量 AI 网站使用说明

这套网站的使用方式可以理解成：

```text
你维护 content/ 数据
        ↓
生成器自动生成 HTML、互链、SEO/GEO 文件
        ↓
GitHub Pages 自动部署
```

也可以使用更省事的 AI Inbox 流程：

```text
你上传原始 Markdown/TXT 到 content/inbox
        ↓
AI 读取 Pipeline DSL，拆文章和知识点
        ↓
自动创建 Pull Request
        ↓
你审核合并
        ↓
GitHub Pages 自动部署
```

## 你日常只做三件事

### 0. 最简单：上传到 Inbox，让 AI 先开 PR

在 GitHub 仓库里进入：

```text
content/inbox/
```

上传 `.md`、`.markdown` 或 `.txt` 文件，然后提交到 `main`。GitHub Actions 会自动运行：

```text
AI Inbox Draft PR
```

它会按 `content/pipeline/chongliang-ai.pipeline.json` 这份 DSL 生成：

- 新文章：`content/articles/*.md`
- 新知识点：`content/concepts/*.md`
- 自动互链字段
- 生成后的 HTML
- SEO/GEO 索引文件

然后它会自动开一个 Pull Request。你只需要检查 PR 里的内容，确认没问题后合并。合并后，网站会自动部署。

第一次使用前，需要配置一个模型服务。OpenAI 和 DeepSeek 二选一即可。

如果使用 OpenAI：

1. 进入 GitHub 仓库 `Settings → Secrets and variables → Actions`。
2. 点击 `New repository secret`。
3. 名称填 `OPENAI_API_KEY`。
4. Value 填你的 OpenAI API Key。
5. 可选：在 `Variables` 里增加 `OPENAI_MODEL`，不填则默认 `gpt-4.1`。

如果使用 DeepSeek：

1. 进入 GitHub 仓库 `Settings → Secrets and variables → Actions`。
2. 点击 `New repository secret`。
3. 名称填 `DEEPSEEK_API_KEY`。
4. Value 填你的 DeepSeek API Key。
5. 切到 `Variables`，新增 `AI_PROVIDER`，值填 `deepseek`。
6. 可选：新增 `DEEPSEEK_MODEL`，不填则默认 `deepseek-v4-flash`。

这个流程会把 inbox 里的原始内容发送给你配置的模型 API，所以不要上传敏感资料。

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

当前仓库已经配置好 GitHub Actions。以后每次 push 到 `main` 分支，会自动构建并发布到 `gh-pages` 分支：

```text
https://pengcong2020520.github.io/chongliang-ai-site/
```

如果你换仓库重新部署：

1. 在 GitHub 新建仓库，例如 `chongliang-ai-site`。
2. 把本目录所有文件上传到仓库根目录。
3. 保留 `.github/workflows/deploy.yml`。
4. 进入仓库 `Settings → Pages`。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `gh-pages`，目录选择 `/`。
7. 把 `.github/workflows/deploy.yml` 里的 `SITE_URL` 改成新仓库的 Pages 地址或正式域名。

## 绑定域名

等你域名确定后，需要做三件事：

1. 在 `content/site.json` 里把 `siteUrl` 改成正式域名。
2. 在 `.github/workflows/deploy.yml` 里把 `SITE_URL` 改成正式域名。
3. 在仓库根目录增加 `CNAME` 文件，内容就是你的域名，例如：

```text
chongliang.ai
```

4. 运行或等待 GitHub Actions 自动重新部署。

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

## 为什么要有 DSL

`content/pipeline/chongliang-ai.pipeline.json` 是这条自动化链路的“规则文件”。它把 AI 处理过程拆成固定阶段，并约束输出结构。

这样做的好处是：

- 输出更稳定，不完全依赖一次性的提示词。
- 文章和知识点的字段不会乱。
- 以后从“自动开 PR”升级到“自动合并部署”时，链路更容易验证。
- 你可以通过改 DSL 调整拆解粒度，而不是每次重写提示词。
