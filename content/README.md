# Content Authoring Guide

这个目录是网站的内容源。

## 你以后主要维护三个地方

- `articles/`: 放文章 Markdown。
- `concepts/`: 放知识点 Markdown。
- `projects.json`: 放项目数据。

维护完成后，在站点根目录运行：

```bash
node scripts/build-content.mjs
```

## SEO 字段

这些字段直接影响搜索引擎理解页面：

- `title`: 页面标题。
- `description`: 搜索结果摘要。
- `date` / `updated`: 发布和更新日期。
- `tags`: 主题标签。
- `slug`: URL 路径，建议稳定不改。

## GEO 字段

这些字段直接影响 AI 检索和生成式搜索引用：

- `definition`: 概念的正式定义。
- `summary`: 概念或文章的一句话摘要。
- `citation`: 可被 AI 引用的短摘要。
- `concepts`: 文章关联的知识点。
- `relatedConcepts`: 知识点之间的关系。
- `relatedArticles`: 知识点关联的文章。

## 推荐工作流

1. 先写文章。
2. 从文章里拆出概念。
3. 给文章补 `concepts`。
4. 给概念补 `relatedConcepts` 和 `citation`。
5. 运行生成器。
6. 检查生成后的文章页和知识点页互链是否合理。
