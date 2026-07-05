import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "_site");
const textExtensions = new Set([".html", ".xml", ".txt", ".json", ".svg"]);

const publicPaths = [
  "404.html",
  "about",
  "articles",
  "assets",
  "en",
  "feed.xml",
  "geo-index.json",
  "index.html",
  "knowledge",
  "llms-full.txt",
  "llms.txt",
  "projects",
  "robots.txt",
  "search-index.json",
  "sitemap.xml"
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const item of publicPaths) {
  await cp(path.join(ROOT, item), path.join(OUT, item), { recursive: true });
}

await writeFile(path.join(OUT, ".nojekyll"), "", "utf8");

const normalizeUrl = (value = "") => String(value).trim().replace(/\/+$/, "");

async function rewriteSiteUrl(dir, fromUrl, toUrl) {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      await rewriteSiteUrl(fullPath, fromUrl, toUrl);
      continue;
    }
    if (!textExtensions.has(path.extname(entry))) continue;
    const raw = await readFile(fullPath, "utf8");
    if (!raw.includes(fromUrl)) continue;
    await writeFile(fullPath, raw.replaceAll(fromUrl, toUrl), "utf8");
  }
}

const deploySiteUrl = normalizeUrl(process.env.SITE_URL);
if (deploySiteUrl) {
  const site = JSON.parse(await readFile(path.join(ROOT, "content", "site.json"), "utf8"));
  const sourceSiteUrl = normalizeUrl(site.siteUrl);
  if (sourceSiteUrl && deploySiteUrl !== sourceSiteUrl) {
    await rewriteSiteUrl(OUT, sourceSiteUrl, deploySiteUrl);
    console.log(`Rewrote absolute site URLs for deploy: ${deploySiteUrl}`);
  }
}

console.log(`Prepared deploy artifact: ${path.relative(ROOT, OUT)}`);
