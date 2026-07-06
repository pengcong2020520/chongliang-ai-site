import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const DSL_PATH = path.join(CONTENT, "pipeline", "chongliang-ai.pipeline.json");
const SUMMARY_PATH = path.join(ROOT, ".ai-inbox-summary.md");
const PROCESSED_PATH = path.join(CONTENT, "inbox", ".processed.json");
const NO_INDEX = new Set(["README.md", "template.md"]);
const today = new Date().toISOString().slice(0, 10);

const requestedProvider = (process.env.AI_PROVIDER || "").toLowerCase();
const provider = requestedProvider || (process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai");
const providerConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    apiKeyName: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4.1",
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "")
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    apiKeyName: "DEEPSEEK_API_KEY",
    model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || "deepseek-v4-flash",
    baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "")
  }
};

if (!providerConfig[provider]) {
  throw new Error(`Unsupported AI_PROVIDER "${provider}". Use "openai" or "deepseek".`);
}

const activeProvider = providerConfig[provider];
const apiKey = activeProvider.apiKey;
const model = normalizeModelName(provider, activeProvider.model);

function normalizeModelName(modelProvider, value) {
  const raw = String(value || "").trim();
  if (modelProvider !== "deepseek") return raw;

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    deepseekv4pro: "deepseek-v4-pro",
    v4pro: "deepseek-v4-pro",
    deepseekv4flash: "deepseek-v4-flash",
    v4flash: "deepseek-v4-flash"
  };

  return aliases[compact] || raw.toLowerCase().replace(/[\s_]+/g, "-");
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function normalizeOneLine(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base, used, fallback) {
  const clean = slugify(base) || slugify(fallback) || "generated-content";
  let candidate = clean;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${clean}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function quoteYaml(value = "") {
  const text = normalizeOneLine(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${text}"`;
}

function yamlValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => quoteYaml(item)).join(", ")}]`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  return quoteYaml(value);
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeOneLine(item)).filter(Boolean))];
}

function cleanBody(markdown = "") {
  return String(markdown)
    .replace(/^#\s+.+$/gm, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function excerpt(markdown = "", limit = 1800) {
  const text = cleanBody(markdown);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[EXCERPT TRUNCATED]`;
}

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${yamlValue(value)}`).join("\n")}\n---\n`;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
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
    return inner.split(",").map((item) => parseScalar(item)).filter(Boolean);
  }
  return parseScalar(value);
}

function parseFrontmatter(raw, filePath) {
  if (!raw.startsWith("---\n")) return { data: {}, body: raw };
  const end = raw.indexOf("\n---", 4);
  if (end === -1) throw new Error(`${filePath} has unclosed frontmatter`);
  const header = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trim();
  const data = {};
  for (const line of header.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    data[line.slice(0, colon).trim()] = parseValue(line.slice(colon + 1));
  }
  return { data, body };
}

async function listInboxFiles(dir, acceptedExtensions, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      files.push(...await listInboxFiles(path.join(dir, entry.name), acceptedExtensions, baseDir));
      continue;
    }
    if (NO_INDEX.has(entry.name)) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!acceptedExtensions.has(extension)) continue;
    const filePath = path.join(dir, entry.name);
    files.push({
      filePath,
      relativePath: toPosix(path.relative(baseDir, filePath)),
      extension
    });
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function loadCollection(dirName) {
  const dir = path.join(CONTENT, dirName);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md") && !NO_INDEX.has(file));
  const items = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = await readFile(filePath, "utf8");
    const parsed = parseFrontmatter(raw, filePath);
    items.push({ ...parsed.data, file, body: parsed.body });
  }
  return items;
}

function compactExistingContext(concepts, articles) {
  return {
    concepts: concepts.map((item) => ({
      slug: item.slug,
      title: item.title,
      term: item.term,
      aliases: item.aliases || [],
      category: item.category,
      summary: item.summary,
      definition: item.definition,
      parent: item.parent || item.category,
      citation: item.citation,
      bodyExcerpt: excerpt(item.body)
    })),
    articles: articles.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      concepts: item.concepts || [],
      bodyExcerpt: excerpt(item.body, 1200)
    }))
  };
}

const conceptSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "operation",
    "title",
    "slug",
    "term",
    "aliases",
    "category",
    "parent",
    "summary",
    "definition",
    "not",
    "scenarios",
    "misconceptions",
    "tags",
    "relatedConcepts",
    "relatedArticles",
    "projects",
    "citation",
    "bodyMarkdown"
  ],
  properties: {
    operation: { type: "string", enum: ["create", "update", "merge"] },
    title: { type: "string" },
    slug: { type: "string" },
    term: { type: "string" },
    aliases: { type: "array", items: { type: "string" } },
    category: { type: "string" },
    parent: { type: "string" },
    summary: { type: "string" },
    definition: { type: "string" },
    not: { type: "string" },
    scenarios: { type: "array", items: { type: "string" } },
    misconceptions: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    relatedConcepts: { type: "array", items: { type: "string" } },
    relatedArticles: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    citation: { type: "string" },
    bodyMarkdown: { type: "string" }
  }
};

const articleSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "operation",
    "title",
    "slug",
    "description",
    "tags",
    "concepts",
    "projects",
    "featured",
    "hot",
    "bodyMarkdown"
  ],
  properties: {
    operation: { type: "string", enum: ["create", "update", "merge"] },
    title: { type: "string" },
    slug: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    concepts: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    featured: { type: "boolean" },
    hot: { type: "boolean" },
    bodyMarkdown: { type: "string" }
  }
};

const digestSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sourceTitle", "sourceSummary", "notes", "concepts", "articles"],
  properties: {
    sourceTitle: { type: "string" },
    sourceSummary: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
    concepts: { type: "array", items: conceptSchema },
    articles: { type: "array", items: articleSchema }
  }
};

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractJsonText(text = "") {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function createDigestPrompt({ dsl, context, source }) {
  const maxConcepts = dsl.outputContracts?.concept?.maxItemsPerSource || 8;
  const maxArticles = dsl.outputContracts?.article?.maxItemsPerSource || 2;
  const instructions = [
    "你是冲量 AI 网站的内容管线执行器。",
    "你必须严格执行用户提供的 DSL，不要自由发散。",
    "输出必须是符合 JSON Schema 的 JSON，不要包含 Markdown 代码围栏。",
    "只基于用户上传到 inbox 的原文生成内容，不要编造外部事实。",
    "优先复用已有知识点 slug；如果已有概念能承载，就不要重复创建。",
    "如果原文补充的是已有知识点，必须返回已有 slug，并把 operation 设为 update 或 merge。",
    "如果原文只是补充已有知识点，不要为了补充材料强行创建新文章。",
    "所有正文使用中文 Markdown，只使用二级和三级标题，不要使用 H1。"
  ].join("\n");

  const input = [
    "## Pipeline DSL",
    JSON.stringify(dsl, null, 2),
    "",
    "## Existing Site Context",
    JSON.stringify(context, null, 2),
    "",
    "## Source File",
    `Path: ${source.relativePath}`,
    `SHA256: ${source.hash}`,
    "",
    "## Source Content",
    source.content,
    "",
    "## Execution Requirements",
    `- 最多生成 ${maxConcepts} 个新知识点。`,
    `- 最多生成 ${maxArticles} 篇文章。`,
    "- slug 必须是小写英文、数字和短横线。",
    "- 如果知识点已存在，必须使用 Existing Site Context 中的已有 slug，operation 使用 update 或 merge，并输出合并后的完整 frontmatter 与正文。",
    "- 如果知识点不存在，operation 使用 create。",
    "- 如果只是引用已有知识点，请把已有 slug 放进文章 concepts 或知识点 relatedConcepts。",
    "- 不要为已有概念创建语义重复的知识点或文章。",
    "- concept.bodyMarkdown 必须包含解释、边界、例子和关系。",
    "- article.bodyMarkdown 必须包含核心结论、背景、方法或框架、与知识点的关系。",
    "- 不确定的内容写进 notes，不要硬写成事实。"
  ].join("\n");

  return { instructions, input };
}

async function callOpenAI({ dsl, context, source }) {
  const { instructions, input } = createDigestPrompt({ dsl, context, source });
  const response = await fetch(`${activeProvider.baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "chongliang_ai_inbox_digest",
          strict: true,
          schema: digestSchema
        }
      },
      max_output_tokens: 12000
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) throw new Error("OpenAI response did not include output_text content.");
  return JSON.parse(extractJsonText(text));
}

async function callDeepSeek({ dsl, context, source }) {
  const { instructions, input } = createDigestPrompt({ dsl, context, source });
  const response = await fetch(`${activeProvider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `${instructions}\n你必须输出一个完整 JSON 对象，字段必须符合用户消息里的 JSON Schema。`
        },
        {
          role: "user",
          content: [
            input,
            "",
            "## Required JSON Schema",
            JSON.stringify(digestSchema, null, 2)
          ].join("\n")
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
      stream: false
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`DeepSeek API request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("DeepSeek response did not include choices[0].message.content.");
  return JSON.parse(extractJsonText(text));
}

async function callModel(args) {
  if (provider === "deepseek") return callDeepSeek(args);
  return callOpenAI(args);
}

function writeConceptMarkdown(concept, slug) {
  const fields = {
    type: "concept",
    title: concept.title,
    slug,
    term: concept.term,
    aliases: cleanArray(concept.aliases),
    category: concept.category || "AI",
    parent: concept.parent || concept.category || "AI",
    summary: concept.summary,
    definition: concept.definition,
    not: concept.not,
    scenarios: cleanArray(concept.scenarios),
    misconceptions: cleanArray(concept.misconceptions),
    tags: cleanArray(concept.tags),
    relatedConcepts: cleanArray(concept.relatedConcepts).map(slugify).filter(Boolean),
    relatedArticles: cleanArray(concept.relatedArticles).map(slugify).filter(Boolean),
    projects: cleanArray(concept.projects).map(slugify).filter(Boolean),
    updated: today,
    language: "zh-CN",
    citation: concept.citation
  };
  return `${frontmatter(fields)}\n${cleanBody(concept.bodyMarkdown)}\n`;
}

function mergeUnique(...arrays) {
  return [...new Set(arrays.flatMap((items) => cleanArray(items)))];
}

function preferIncoming(incoming, existing = "") {
  const value = normalizeOneLine(incoming);
  return value || existing || "";
}

function mergeConcept(existing, incoming, slug) {
  return {
    ...incoming,
    title: preferIncoming(incoming.title, existing.title),
    slug,
    term: preferIncoming(incoming.term, existing.term || existing.title),
    aliases: mergeUnique(existing.aliases, incoming.aliases),
    category: preferIncoming(incoming.category, existing.category),
    parent: preferIncoming(incoming.parent, existing.parent || existing.category),
    summary: preferIncoming(incoming.summary, existing.summary),
    definition: preferIncoming(incoming.definition, existing.definition),
    not: preferIncoming(incoming.not, existing.not),
    scenarios: mergeUnique(existing.scenarios, incoming.scenarios),
    misconceptions: mergeUnique(existing.misconceptions, incoming.misconceptions),
    tags: mergeUnique(existing.tags, incoming.tags),
    relatedConcepts: mergeUnique(existing.relatedConcepts, incoming.relatedConcepts),
    relatedArticles: mergeUnique(existing.relatedArticles, incoming.relatedArticles),
    projects: mergeUnique(existing.projects, incoming.projects),
    citation: preferIncoming(incoming.citation, existing.citation),
    bodyMarkdown: cleanBody(incoming.bodyMarkdown) || existing.body || ""
  };
}

function writeArticleMarkdown(article, slug, conceptSlugMap) {
  const concepts = cleanArray(article.concepts)
    .map((item) => conceptSlugMap.get(slugify(item)) || slugify(item))
    .filter(Boolean);
  const fields = {
    type: "article",
    title: article.title,
    slug,
    date: today,
    updated: today,
    description: article.description,
    source: "inbox",
    sourceLabel: "INBOX AI",
    originalUrl: "",
    tags: cleanArray(article.tags),
    concepts,
    projects: cleanArray(article.projects).map(slugify).filter(Boolean),
    featured: Boolean(article.featured),
    hot: Boolean(article.hot),
    language: "zh-CN"
  };
  return `${frontmatter(fields)}\n${cleanBody(article.bodyMarkdown)}\n`;
}

function mergeArticle(existing, incoming, slug) {
  return {
    ...incoming,
    title: preferIncoming(incoming.title, existing.title),
    slug,
    description: preferIncoming(incoming.description, existing.description),
    tags: mergeUnique(existing.tags, incoming.tags),
    concepts: mergeUnique(existing.concepts, incoming.concepts),
    projects: mergeUnique(existing.projects, incoming.projects),
    featured: Boolean(incoming.featured || existing.featured),
    hot: Boolean(incoming.hot || existing.hot),
    bodyMarkdown: cleanBody(incoming.bodyMarkdown) || existing.body || ""
  };
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

function summaryMarkdown({ pending, generated, notes, dsl }) {
  const lines = [
    "# AI Inbox Digest",
    "",
    `Mode: ${dsl.mode || "review_pr"}`,
    `Provider: ${provider}`,
    `Model: ${model}`,
    `Date: ${today}`,
    "",
    "## Source files",
    ...pending.map((item) => `- ${item.relativePath}`)
  ];

  lines.push("", "## Generated concepts");
  if (generated.concepts.length) {
    lines.push(...generated.concepts.map((item) => `- \`${item.slug}\` - ${item.title}`));
  } else {
    lines.push("- None");
  }

  lines.push("", "## Updated concepts");
  if (generated.updatedConcepts.length) {
    lines.push(...generated.updatedConcepts.map((item) => `- \`${item.slug}\` - ${item.title}`));
  } else {
    lines.push("- None");
  }

  lines.push("", "## Generated articles");
  if (generated.articles.length) {
    lines.push(...generated.articles.map((item) => `- \`${item.slug}\` - ${item.title}`));
  } else {
    lines.push("- None");
  }

  lines.push("", "## Updated articles");
  if (generated.updatedArticles.length) {
    lines.push(...generated.updatedArticles.map((item) => `- \`${item.slug}\` - ${item.title}`));
  } else {
    lines.push("- None");
  }

  lines.push("", "## Notes");
  if (notes.length) {
    lines.push(...notes.map((item) => `- ${item}`));
  } else {
    lines.push("- No model notes.");
  }

  lines.push("", "## Human review checklist");
  for (const item of dsl.reviewPolicy?.humanChecklist || []) {
    lines.push(`- [ ] ${item}`);
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  const dsl = await readJson(DSL_PATH, null);
  if (!dsl) throw new Error(`Missing pipeline DSL: ${DSL_PATH}`);

  const inboxDir = path.join(ROOT, dsl.source?.inbox || "content/inbox");
  const acceptedExtensions = new Set(dsl.source?.acceptedExtensions || [".md", ".markdown", ".txt"]);
  const maxFiles = Number(process.env.AI_INBOX_MAX_FILES || dsl.source?.maxFilesPerRun || 5);
  const maxChars = Number(process.env.AI_INBOX_MAX_CHARS || dsl.source?.maxCharactersPerFile || 60000);

  const processed = await readJson(PROCESSED_PATH, { version: 1, files: {} });
  processed.version = processed.version || 1;
  processed.files = processed.files || {};

  const allFiles = await listInboxFiles(inboxDir, acceptedExtensions);
  const pending = [];
  for (const item of allFiles) {
    const raw = await readFile(item.filePath, "utf8");
    const hash = sha256(raw);
    if (processed.files[item.relativePath]?.hash === hash) continue;
    pending.push({
      ...item,
      hash,
      content: raw.length > maxChars ? `${raw.slice(0, maxChars)}\n\n[TRUNCATED: ${raw.length - maxChars} characters omitted]` : raw
    });
  }

  if (!pending.length) {
    await writeFile(SUMMARY_PATH, `# AI Inbox Digest\n\nProvider: ${provider}\nModel: ${model}\n\nNo new inbox files to process.\n`, "utf8");
    console.log("No new inbox files to process.");
    return;
  }

  if (!apiKey) {
    throw new Error(`${activeProvider.apiKeyName} is required when content/inbox contains new files to process with AI_PROVIDER=${provider}.`);
  }

  const limitedPending = pending.slice(0, maxFiles);
  const concepts = await loadCollection("concepts");
  const articles = await loadCollection("articles");
  const context = compactExistingContext(concepts, articles);
  const existingConceptBySlug = new Map(concepts.map((item) => [slugify(item.slug || item.file.replace(/\.md$/, "")), item]).filter(([slug]) => slug));
  const existingArticleBySlug = new Map(articles.map((item) => [slugify(item.slug || item.file.replace(/\.md$/, "")), item]).filter(([slug]) => slug));
  const existingConceptSlugs = new Set(existingConceptBySlug.keys());
  const existingArticleSlugs = new Set(existingArticleBySlug.keys());
  const conceptLookup = new Map();
  for (const [slug, concept] of existingConceptBySlug.entries()) {
    for (const key of [slug, concept.term, concept.title, ...(concept.aliases || [])]) {
      const normalized = slugify(key);
      if (normalized) conceptLookup.set(normalized, slug);
    }
  }
  const usedConceptSlugs = new Set(existingConceptSlugs);
  const usedArticleSlugs = new Set(existingArticleSlugs);
  const conceptSlugMap = new Map([...existingConceptSlugs].map((slug) => [slug, slug]));
  const generated = { concepts: [], updatedConcepts: [], articles: [], updatedArticles: [] };
  const notes = [];

  await ensureDir(path.join(CONTENT, "concepts"));
  await ensureDir(path.join(CONTENT, "articles"));

  for (const source of limitedPending) {
    const digest = await callModel({ dsl, context, source });
    notes.push(...cleanArray(digest.notes).map((note) => `${source.relativePath}: ${note}`));

    const sourceGenerated = { concepts: [], updatedConcepts: [], articles: [], updatedArticles: [] };
    for (const concept of Array.isArray(digest.concepts) ? digest.concepts : []) {
      const requestedSlug = slugify(concept.slug || concept.term || concept.title);
      const targetSlug = conceptLookup.get(requestedSlug) || conceptLookup.get(slugify(concept.term)) || conceptLookup.get(slugify(concept.title));
      if (targetSlug && existingConceptBySlug.has(targetSlug)) {
        const existing = existingConceptBySlug.get(targetSlug);
        const merged = mergeConcept(existing, concept, targetSlug);
        conceptSlugMap.set(requestedSlug, targetSlug);
        conceptSlugMap.set(slugify(concept.term), targetSlug);
        const filePath = path.join(CONTENT, "concepts", `${targetSlug}.md`);
        await writeFile(filePath, writeConceptMarkdown(merged, targetSlug), "utf8");
        const record = { slug: targetSlug, title: merged.title, file: `content/concepts/${targetSlug}.md`, operation: concept.operation || "merge" };
        generated.updatedConcepts.push(record);
        sourceGenerated.updatedConcepts.push(record);
        notes.push(`${source.relativePath}: merged into existing concept ${targetSlug}.`);
        continue;
      }
      const slug = uniqueSlug(requestedSlug, usedConceptSlugs, path.basename(source.relativePath, path.extname(source.relativePath)));
      conceptSlugMap.set(requestedSlug, slug);
      const filePath = path.join(CONTENT, "concepts", `${slug}.md`);
      await writeFile(filePath, writeConceptMarkdown(concept, slug), "utf8");
      const record = { slug, title: concept.title, file: `content/concepts/${slug}.md` };
      generated.concepts.push(record);
      sourceGenerated.concepts.push(record);
    }

    for (const article of Array.isArray(digest.articles) ? digest.articles : []) {
      const requestedSlug = slugify(article.slug || article.title);
      const existingArticle = existingArticleBySlug.get(requestedSlug);
      if (existingArticle) {
        const merged = mergeArticle(existingArticle, article, requestedSlug);
        const filePath = path.join(CONTENT, "articles", `${requestedSlug}.md`);
        await writeFile(filePath, writeArticleMarkdown(merged, requestedSlug, conceptSlugMap), "utf8");
        const record = { slug: requestedSlug, title: merged.title, file: `content/articles/${requestedSlug}.md`, operation: article.operation || "merge" };
        generated.updatedArticles.push(record);
        sourceGenerated.updatedArticles.push(record);
        notes.push(`${source.relativePath}: merged into existing article ${requestedSlug}.`);
        continue;
      }
      const slug = uniqueSlug(requestedSlug, usedArticleSlugs, path.basename(source.relativePath, path.extname(source.relativePath)));
      const filePath = path.join(CONTENT, "articles", `${slug}.md`);
      await writeFile(filePath, writeArticleMarkdown(article, slug, conceptSlugMap), "utf8");
      const record = { slug, title: article.title, file: `content/articles/${slug}.md` };
      generated.articles.push(record);
      sourceGenerated.articles.push(record);
    }

    processed.files[source.relativePath] = {
      hash: source.hash,
      processedAt: new Date().toISOString(),
      sourceTitle: digest.sourceTitle || source.relativePath,
      sourceSummary: digest.sourceSummary || "",
      generated: sourceGenerated
    };
  }

  if (pending.length > limitedPending.length) {
    notes.push(`Skipped ${pending.length - limitedPending.length} files because maxFilesPerRun is ${maxFiles}. They will be processed in a later run.`);
  }

  await writeFile(PROCESSED_PATH, `${JSON.stringify(processed, null, 2)}\n`, "utf8");
  await writeFile(SUMMARY_PATH, summaryMarkdown({ pending: limitedPending, generated, notes, dsl }), "utf8");
  console.log(`Processed ${limitedPending.length} inbox file(s). Generated ${generated.concepts.length} concept(s), updated ${generated.updatedConcepts.length} concept(s), generated ${generated.articles.length} article(s), and updated ${generated.updatedArticles.length} article(s).`);
}

await main();
