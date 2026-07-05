# Concepts

这个目录维护“原子知识点”。每个概念一个 Markdown 文件，生成器会自动创建：

- `knowledge/index.html`
- `knowledge/{slug}/index.html`
- 概念之间的互链
- 文章到概念的反链
- `geo-index.json`
- `llms-full.txt`

## 维护方式

复制 `template.md`，改掉 frontmatter 和正文即可。

知识点页建议保持稳定结构：

1. 一句话定义
2. 适用场景
3. 它不是什么
4. 常见误区
5. 相关概念
6. 关联文章
7. 可引用摘要

这些字段会直接影响 SEO 和 GEO。
