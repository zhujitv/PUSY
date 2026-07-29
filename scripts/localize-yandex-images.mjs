import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogPath = path.join(root, "app", "data", "products.generated.json");
const blogPath = path.join(root, "app", "data", "blog.ts");
const outputDirectory = path.join(root, "public", "products", "yandex");
const manifestPath = path.join(outputDirectory, "manifest.json");
const publicPrefix = "/products/yandex";
const concurrency = Math.max(1, Math.min(8, Number(process.env.YANDEX_IMAGE_CONCURRENCY || 6)));
const yandexImagePattern = /^https:\/\/avatars\.mds\.yandex\.net\/get-yastore\//;

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const blogSource = await fs.readFile(blogPath, "utf8");
await fs.mkdir(outputDirectory, { recursive: true });

let previousManifest = { assets: {} };
try {
  previousManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const discoveredUrls = new Set();
walkStrings(catalog, (value) => {
  if (yandexImagePattern.test(value)) discoveredUrls.add(value);
});
for (const match of blogSource.matchAll(/https:\/\/avatars\.mds\.yandex\.net\/get-yastore\/[^"'\s)]+/g)) {
  discoveredUrls.add(match[0]);
}
for (const asset of Object.values(previousManifest.assets || {})) {
  if (asset?.sourceUrl && yandexImagePattern.test(asset.sourceUrl)) discoveredUrls.add(asset.sourceUrl);
}

const urls = [...discoveredUrls].sort();
if (!urls.length) {
  console.log("No Yandex image URLs found in the catalog or previous manifest.");
  process.exit(0);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sources: ["app/data/products.generated.json", "app/data/blog.ts"],
  format: "webp",
  maxWidth: 1400,
  quality: 82,
  assets: {},
};

let completed = 0;
let downloaded = 0;
let reused = 0;
let originalBytes = 0;
let localizedBytes = 0;
const failures = [];

await runPool(urls, concurrency, async (url) => {
  const fileName = fileNameForUrl(url);
  const targetPath = path.join(outputDirectory, fileName);
  const publicPath = `${publicPrefix}/${fileName}`;
  const previous = previousManifest.assets?.[publicPath];

  let sourceSize = Number(previous?.sourceBytes || 0);
  let outputSize = 0;
  try {
    outputSize = (await fs.stat(targetPath)).size;
    reused += 1;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try {
      const result = await downloadAndOptimize(url, targetPath);
      sourceSize = result.sourceBytes;
      outputSize = result.outputBytes;
      downloaded += 1;
    } catch (error) {
      failures.push({ url, targetPath, error });
      completed += 1;
      console.warn(`[${completed}/${urls.length}] deferred after repeated timeout: ${url}`);
      return;
    }
  }

  originalBytes += sourceSize;
  localizedBytes += outputSize;
  manifest.assets[publicPath] = {
    sourceUrl: url,
    sourceBytes: sourceSize,
    outputBytes: outputSize,
  };

  completed += 1;
  if (completed % 10 === 0 || completed === urls.length) {
    console.log(`[${completed}/${urls.length}] localized (${downloaded} downloaded, ${reused} reused)`);
  }
});

if (failures.length) {
  console.log(`Retrying ${failures.length} deferred images with a longer timeout...`);
  for (const failure of failures) {
    const fallbackTo = findAvailableProductImage(failure.url);
    if (fallbackTo) {
      const publicPath = `${publicPrefix}/${path.basename(failure.targetPath)}`;
      manifest.assets[publicPath] = {
        sourceUrl: failure.url,
        sourceBytes: 0,
        outputBytes: 0,
        fallbackTo,
      };
      console.warn(`Using ${fallbackTo} as fallback for unavailable source ${failure.url}`);
      continue;
    }
    const result = await downloadAndOptimize(failure.url, failure.targetPath, {
      attempts: 4,
      timeoutMs: 120_000,
    });
    const fileName = path.basename(failure.targetPath);
    const publicPath = `${publicPrefix}/${fileName}`;
    manifest.assets[publicPath] = {
      sourceUrl: failure.url,
      sourceBytes: result.sourceBytes,
      outputBytes: result.outputBytes,
    };
    originalBytes += result.sourceBytes;
    localizedBytes += result.outputBytes;
    downloaded += 1;
    console.log(`Recovered ${publicPath}`);
  }
}

const sourceToLocal = new Map(
  Object.entries(manifest.assets).map(([publicPath, asset]) => [asset.sourceUrl, asset.fallbackTo || publicPath]),
);
const rewrittenCatalog = replaceStrings(catalog, (value) => sourceToLocal.get(value) || value);
let rewrittenBlog = blogSource;
for (const [sourceUrl, publicPath] of sourceToLocal) {
  rewrittenBlog = rewrittenBlog.replaceAll(sourceUrl, publicPath);
}

await fs.writeFile(catalogPath, `${JSON.stringify(rewrittenCatalog, null, 2)}\n`);
await fs.writeFile(blogPath, rewrittenBlog);
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Localized ${urls.length} images. Output ${(localizedBytes / 1024 / 1024).toFixed(2)} MiB` +
  (originalBytes ? ` from ${(originalBytes / 1024 / 1024).toFixed(2)} MiB of source files.` : "."),
);

function fileNameForUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const assetId = parts.at(-2) || "image";
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "image";
  const digest = crypto.createHash("sha256").update(url).digest("hex").slice(0, 10);
  return `${safeId}-${digest}.webp`;
}

function findAvailableProductImage(sourceUrl) {
  for (const product of catalog) {
    const references = [product.image, product.imageAlt, ...(product.images || [])].filter(Boolean);
    if (!references.includes(sourceUrl)) continue;
    for (const candidate of references) {
      if (!yandexImagePattern.test(candidate) || candidate === sourceUrl) continue;
      const candidatePath = `${publicPrefix}/${fileNameForUrl(candidate)}`;
      if (manifest.assets[candidatePath] && !manifest.assets[candidatePath].fallbackTo) return candidatePath;
    }
  }
  return null;
}

async function downloadAndOptimize(url, targetPath, options = {}) {
  const attempts = options.attempts || 3;
  const timeoutMs = options.timeoutMs || 60_000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const temporaryPath = `${targetPath}.tmp-${process.pid}`;
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "PUSY-Catalog-Localizer/1.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = Buffer.from(await response.arrayBuffer());
      if (!source.length) throw new Error("empty response");

      await sharp(source)
        .rotate()
        .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4, smartSubsample: true })
        .toFile(temporaryPath);
      await fs.rename(temporaryPath, targetPath);
      const outputBytes = (await fs.stat(targetPath)).size;
      return { sourceBytes: source.length, outputBytes };
    } catch (error) {
      lastError = error;
      await fs.rm(temporaryPath, { force: true });
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Failed to localize ${url}: ${lastError?.message || lastError}`);
}

async function runPool(items, limit, worker) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

function walkStrings(value, visit) {
  if (typeof value === "string") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walkStrings(item, visit);
  }
}

function replaceStrings(value, replace) {
  if (typeof value === "string") return replace(value);
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, replace));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStrings(item, replace)]),
    );
  }
  return value;
}
