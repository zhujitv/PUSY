import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "assets");
const target = path.join(root, "miniprogram", "assets");

const assets = [
  ["hero-clean-v2.png", "hero.jpg", 1200, 74],
  ["35.webp", "secret-box.jpg", 900, 76],
  ...Array.from({ length: 15 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return [`${number}.webp`, `${number}.jpg`, 720, 72];
  }),
];

await fs.mkdir(target, { recursive: true });

for (const [input, output, width, quality] of assets) {
  await sharp(path.join(source, input))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: "#f6f5f3" })
    .jpeg({ quality, mozjpeg: true })
    .toFile(path.join(target, output));
}

const outputFiles = await fs.readdir(target);
const sizes = await Promise.all(outputFiles.map(async (file) => (await fs.stat(path.join(target, file))).size));
const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
console.log(`Generated ${outputFiles.length} mini program assets (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`);
