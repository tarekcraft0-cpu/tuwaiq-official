/**
 * تمريرة ثانية: تكبير/توسيط أقوى للمحتوى الواضح داخل الأفتار.
 * node scripts/tighten-avatars.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DIR = path.join(root, "public/avatars/plato");
const OUT = path.join(root, "public/avatars/plato-normalized");
const SIZE = 128;
const MAX_ZOOM = 1.85;

const circleSvg = Buffer.from(
  `<svg width="128" height="128"><circle cx="64" cy="64" r="64" fill="white"/></svg>`,
);

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".webp")) fs.unlinkSync(path.join(OUT, f));
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp"));
let changed = 0;
let skipped = 0;

for (const f of files) {
  const full = path.join(DIR, f);
  const { data, info } = await sharp(full)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const cx0 = (w - 1) / 2;
  const cy0 = (h - 1) / 2;

  let sumX = 0;
  let sumY = 0;
  let sumW = 0;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let n = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i + 3] < 40) continue;
      if (Math.hypot(x - cx0, y - cy0) > 63) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const L = r * 0.3 + g * 0.59 + b * 0.11;
      const C = Math.max(r, g, b) - Math.min(r, g, b);
      // محتوى واضح فقط (مو الحشوة السوداء)
      if (L < 24 && C < 18) continue;
      const wgt = Math.pow(L / 255, 1.35) * 2 + C / 90 + 0.15;
      sumX += x * wgt;
      sumY += y * wgt;
      sumW += wgt;
      n++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (n < 120 || sumW < 1) {
    fs.copyFileSync(full, path.join(OUT, f));
    skipped++;
    continue;
  }

  const cx = sumX / sumW;
  const cy = sumY / sumW;
  const offset = Math.hypot(cx - cx0, cy - cy0);
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  // نصف قطر من المركز الموزون
  const dists = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = (y * w + x) * ch;
      if (data[i + 3] < 40) continue;
      const L = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      const C =
        Math.max(data[i], data[i + 1], data[i + 2]) -
        Math.min(data[i], data[i + 1], data[i + 2]);
      if (L < 24 && C < 18) continue;
      dists.push(Math.hypot(x - cx, y - cy));
    }
  }
  dists.sort((a, b) => a - b);
  const coverR = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.94))];
  let side = Math.ceil(Math.max(bw, bh, coverR * 2) * 1.1);
  const minSide = Math.ceil(SIZE / MAX_ZOOM);
  if (side < minSide) side = minSide;
  if (side > SIZE) side = SIZE;

  const needs = offset >= 3.5 || side <= 118 || Math.max(bw, bh) <= 112;
  if (!needs) {
    fs.copyFileSync(full, path.join(OUT, f));
    skipped++;
    continue;
  }

  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);
  left = Math.max(0, Math.min(w - side, left));
  top = Math.max(0, Math.min(h - side, top));
  const width = Math.min(side, w - left);
  const height = Math.min(side, h - top);

  await sharp(full)
    .extract({ left, top, width, height })
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .composite([{ input: circleSvg, blend: "dest-in" }])
    .webp({ quality: 88 })
    .toFile(path.join(OUT, f));
  changed++;
}

console.log({ changed, skipped, total: files.length, out: OUT });
