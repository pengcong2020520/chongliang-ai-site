# Inbox

这里是“唯一上传入口”。

你可以把新的文章草稿、知识库导出片段、概念笔记上传到这里。支持：

- `.md`
- `.markdown`
- `.txt`

推荐规则：

- 一个文件只放一个主题或一组强相关内容。
- 文件名尽量使用英文小写和短横线，例如 `ai-agent-notes.md`。
- 不要上传密码、客户隐私、未公开合同、API Key 或其他敏感信息。
- 上传后提交到 `main`，GitHub Actions 会自动运行 AI 拆解流程，并创建一个 Pull Request 给你审核。

AI 会根据 `content/pipeline/chongliang-ai.pipeline.json` 里的 DSL 输出：

- `content/concepts/*.md`
- `content/articles/*.md`
- 自动互链字段
- 生成后的 HTML、SEO、GEO 索引文件

前期策略是“自动开 PR，但不自动合并”。你看完 PR 后再合并，合并后网站会自动部署。
