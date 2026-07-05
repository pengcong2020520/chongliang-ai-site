# Chongliang AI Static Site

这是“冲量 AI”的静态个人知识资产网站。当前已经具备：

- 文章 Markdown 模板与自动生成。
- 知识点 Markdown 模板与自动生成。
- 文章、知识点、项目之间的自动互链。
- SEO 基础文件：`sitemap.xml`、`robots.txt`、`feed.xml`、canonical、结构化数据。
- GEO 辅助文件：`llms.txt`、`llms-full.txt`、`geo-index.json`、`search-index.json`。
- AI Inbox 工作流：上传内容后，AI 按 DSL 拆解文章和知识点，并自动开 Pull Request。

## 日常维护

最推荐的方式是：你只改 `content/`，GitHub Actions 自动运行生成器并部署。

### 最省事的方式：上传到 Inbox

如果你不想手动写 frontmatter，可以直接把文章草稿、知识库导出片段或概念笔记上传到：

```text
content/inbox/
```

支持 `.md`、`.markdown`、`.txt`。提交到 `main` 后，`AI Inbox Draft PR` workflow 会读取 `content/pipeline/chongliang-ai.pipeline.json` 这份 DSL，自动拆解并创建 Pull Request。

当前策略是：

```text
上传原始内容 → AI 按 DSL 生成文章/知识点 → 自动开 PR → 你审核合并 → 自动部署
```

启用这个流程前，需要在 GitHub 仓库里配置一个模型服务。OpenAI 和 DeepSeek 二选一即可。

使用 OpenAI：

- `Settings → Secrets and variables → Actions → New repository secret`
- Secret 名称：`OPENAI_API_KEY`
- 可选变量：`OPENAI_MODEL`，默认使用 `gpt-4.1`

使用 DeepSeek：

- `Settings → Secrets and variables → Actions → New repository secret`
- Secret 名称：`DEEPSEEK_API_KEY`
- `Settings → Secrets and variables → Actions → Variables → New repository variable`
- 变量 `AI_PROVIDER` 填 `deepseek`
- 可选变量 `DEEPSEEK_MODEL`，默认使用 `deepseek-v4-flash`；如果要用 DeepSeek V4 Pro，推荐填 API 模型 ID：`deepseek-v4-pro`

注意：上传到 `content/inbox/` 的内容会发送给你配置的模型 API 处理。不要上传密码、客户隐私、API Key 或不适合公开处理的资料。

自动开 PR 还依赖一个仓库开关：`Settings → Actions → General → Workflow permissions` 里需要选择 `Read and write permissions`，并勾选 `Allow GitHub Actions to create and approve pull requests`。

新增文章：

1. 复制 `content/articles/template.md`。
2. 改成你的文章文件，例如 `content/articles/my-new-article.md`。
3. 填 frontmatter，尤其是 `title`、`slug`、`date`、`description`、`tags`、`concepts`。
4. 写正文 Markdown。
5. 本地预览时运行：

```bash
npm run build
```

如果是在 GitHub 网页上直接新增文章，提交后会自动部署，不需要你手动运行命令。

新增知识点：

1. 复制 `content/concepts/template.md`。
2. 改成一个概念文件，例如 `content/concepts/evaluation-harness.md`。
3. 填 `term`、`definition`、`summary`、`citation`、`relatedConcepts`、`relatedArticles`。
4. 本地预览时运行 `npm run build`；GitHub 提交后会自动部署。

维护项目：

1. 编辑 `content/projects.json`。
2. 填项目名、GitHub URL、描述、标签、关联知识点、关联文章。
3. 本地预览时运行 `npm run build`；GitHub 提交后会自动部署。

## SEO/GEO 内容模型

文章页负责叙事和方法论，知识点页负责定义和边界，项目页负责证明。生成器会根据 frontmatter 自动建立互链：

- 文章声明 `concepts` 后，文章页底部会出现关联知识点。
- 知识点会反向显示引用它的文章。
- 项目声明 `relatedConcepts` 后，会出现在对应知识点页。
- `sitemap.xml` 和 `llms.txt` 会自动更新。

## 文件结构

- `content/articles/`: 文章 Markdown。
- `content/concepts/`: 原子知识点 Markdown。
- `content/projects.json`: 项目数据。
- `content/site.json`: 站点基础信息。
- `content/inbox/`: AI 自动拆解的上传入口。
- `content/pipeline/`: AI 内容链路 DSL。
- `scripts/build-content.mjs`: 无依赖静态生成器。
- `scripts/ai-digest-inbox.mjs`: AI Inbox 拆解脚本。
- `articles/`: 生成后的文章页面。
- `knowledge/`: 生成后的知识库页面。
- `projects/`: 生成后的项目页面。

## 部署

当前仓库已经配置好 GitHub Actions，push 到 `main` 后会自动生成 `_site` 并发布到 `gh-pages` 分支。

仓库设置：

1. 进入 GitHub 仓库 `Settings → Pages`。
2. Source 选择 `Deploy from a branch`。
3. Branch 选择 `gh-pages`，目录选择 `/`。
4. push 到 `main` 分支后，GitHub Actions 会自动生成并发布 `_site`。

当前临时线上地址：

```text
https://pengcong2020520.github.io/chongliang-ai-site/
```

本地打包检查：

```bash
npm run build:deploy
```

如果绑定正式域名，请同步修改两处：

1. 在 `content/site.json` 中把 `siteUrl` 改成最终域名。
2. 在 `.github/workflows/deploy.yml` 中把 `SITE_URL` 改成最终域名。

然后重新运行或等待 GitHub Actions 自动运行：

```bash
npm run build
```

更详细的使用说明见 `USAGE.md`。

## 重要原则

`content/` 是源数据，`articles/`、`knowledge/`、`projects/`、`sitemap.xml`、`llms.txt` 等是生成结果。以后优先改 `content/`，再运行生成器。
