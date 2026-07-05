# Articles

把文章 Markdown 放在这个目录下，然后运行：

```bash
node scripts/build-content.mjs
```

生成器会自动更新：

- `articles/index.html`
- `articles/{slug}/index.html`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`
- `search-index.json`
- `geo-index.json`
- `feed.xml`

## Frontmatter 字段

复制 `template.md` 作为新文章起点。常用字段：

- `title`: 文章标题。
- `slug`: URL 路径，只用小写英文、数字、短横线。
- `date`: 发布日期，格式 `YYYY-MM-DD`。
- `updated`: 最后更新日期。
- `description`: 文章摘要，用于 SEO description 和卡片摘要。
- `source`: `local`、`wechat`、`woshipm`、`external`。
- `sourceLabel`: 展示给读者看的来源标签。
- `originalUrl`: 外部原文链接，没有就留空。
- `tags`: 标签数组。
- `concepts`: 关联知识点 slug 数组。
- `projects`: 关联项目 slug 数组。
- `featured`: 是否在首页突出展示。
- `hot`: 是否作为热门内容。

文章正文使用 Markdown。二级、三级标题会自动生成文章目录。
