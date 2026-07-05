import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "_site");

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
console.log(`Prepared deploy artifact: ${path.relative(ROOT, OUT)}`);
