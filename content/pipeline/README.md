# Pipeline DSL

`chongliang-ai.pipeline.json` 是冲量 AI 网站的内容处理 DSL。

它负责约束整条链路：

```text
content/inbox 上传原始内容
        ↓
AI 按 DSL 拆解文章和知识点
        ↓
生成 content/articles 与 content/concepts
        ↓
构建 HTML、SEO、GEO、互链索引
        ↓
自动创建 Pull Request
        ↓
你审核合并后自动部署
```

这个 DSL 的作用不是展示给读者，而是让自动化流程稳定：

- 固定输入目录。
- 固定处理阶段。
- 固定文章和知识点的 frontmatter 字段。
- 固定 SEO/GEO 输出要求。
- 固定“先 PR 审核、后合并部署”的发布策略。
- 固定“已有概念优先合并/更新，不新增重复条目”的知识库策略。

以后如果你想调整拆解粒度、知识点正文结构、PR 审核规则，优先改这个 DSL，而不是直接改提示词。
