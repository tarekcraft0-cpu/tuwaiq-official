/**
 * يوحّد أفتارات plato: يشيل الحشوة السوداء ويوسّط ويكبّر المحتوى بحذر.
 * node scripts/normalize-avatars.mjs
 * node scripts/normalize-avatars.mjs --preview
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DIR = path.join(root, "public/avatars/plato");
const OUT_DIR = path.join(root, "public/avatars/plato-normalized");
const PREVIEW = path.join(root, "tmp-new/normalized");
const SIZE = 128;
const MAX_ZOOM = 1.7;
const previewOnly = process.argv.includes("--preview");

const circleSvg = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="64" cy="64" r="64" fill="white"/></svg>`,
);

function pixel(data, w, ch, x, y) {
  const i = (y * w + x) * ch;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2],
    a: data[i + 3],
    L: data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11,
    C:
      Math.max(data[i], data[i + 1], data[i + 2]) -
      Math.min(data[i], data[i + 1], data[i + 2]),
  };
}

function analyze(data, w, h, ch) {
  const cx0 = (w - 1) / 2;
  const cy0 = (h - 1) / 2;

  // متوسط الحافة الخارجية — غالباً حشوة القائمة
  let rimL = 0;
  let rimN = 0;
  for (let a = 0; a < 360; a += 4) {
    const rad = (a * Math.PI) / 180;
    for (const rr of [60, 62, 63]) {
      const x = Math.round(cx0 + rr * Math.cos(rad));
      const y = Math.round(cy0 + rr * Math.sin(rad));
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = pixel(data, w, ch, x, y);
      if (p.a < 40) continue;
      rimL += p.L;
      rimN++;
    }
  }
  const rimMean = rimN ? rimL / rimN : 0;
  // عتبة الحشوة: أغمق من الحافة بقليل أو سوداء مطلقاً
  const padThresh = Math.min(26, Math.max(14, rimMean + 6));

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  let sumW = 0;
  let n = 0;
  let opaque = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pixel(data, w, ch, x, y);
      if (p.a < 40) continue;
      opaque++;
      const dist = Math.hypot(x - cx0, y - cy0);
      // داخل الدائرة فقط
      if (dist > 63.5) continue;

      const isPad = p.L < padThresh && p.C < 16;
      // لا نعتبر الحافة الخارجية محتوى إذا كانت مسطّحة
      if (isPad && dist > 48) continue;
      if (isPad && dist > 36 && p.L < 12) continue;

      n++;
      // مركز موزون بالسطوع/اللون حتى الوجوه الصغيرة تتوسّط صح
      const wgt = 0.35 + (p.L / 255) * 1.4 + (p.C / 255) * 0.8;
      sumX += x * wgt;
      sumY += y * wgt;
      sumW += wgt;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (n < 200 || sumW < 1) return null;

  const cx = sumX / sumW;
  const cy = sumY / sumW;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  // نصف قطر يغطي أغلب المحتوى من المركز الموزون
  let maxDist = 0;
  let distCount = 0;
  const dists = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = pixel(data, w, ch, x, y);
      if (p.a < 40) continue;
      if (p.L < padThresh && p.C < 16) continue;
      const d = Math.hypot(x - cx, y - cy);
      dists.push(d);
      distCount++;
      if (d > maxDist) maxDist = d;
    }
  }
  dists.sort((a, b) => a - b);
  const coverR =
    dists.length > 0
      ? dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.96))]
      : Math.max(bw, bh) / 2;
  const side = Math.max(bw, bh, Math.ceil(coverR * 2));
  const fill = n / Math.max(opaque, 1);
  const offset = Math.hypot(cx - cx0, cy - cy0);

  return {
    cx,
    cy,
    minX,
    minY,
    maxX,
    maxY,
    side,
    fill,
    offset,
    n,
    rimMean,
    padThresh,
  };
}

async function normalizeFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const stats = analyze(data, w, h, ch);

  if (!stats) return { changed: false, reason: "empty" };

  // ممتلئ ومركّز بما يكفي
  if (stats.side >= 120 && stats.offset < 3.2 && stats.fill > 0.62) {
    return { changed: false, reason: "ok", stats };
  }
  if (stats.side >= 124 && stats.offset < 4) {
    return { changed: false, reason: "ok-full", stats };
  }

  // مربع القص حول المحتوى مع هامش
  let side = Math.ceil(stats.side * 1.08);
  // حد أقصى للتكبير
  const minSide = Math.ceil(SIZE / MAX_ZOOM);
  if (side < minSide) side = minSide;
  if (side > SIZE) side = SIZE;

  let left = Math.round(stats.cx - side / 2);
  let top = Math.round(stats.cy - side / 2);
  left = Math.max(0, Math.min(w - side, left));
  top = Math.max(0, Math.min(h - side, top));
  const width = Math.min(side, w - left);
  const height = Math.min(side, h - top);

  // تغيير طفيف جداً لا يستحق الكتابة
  if (width >= 124 && height >= 124 && stats.offset < 3) {
    return { changed: false, reason: "noop", stats };
  }

  const outBuf = await sharp(filePath)
    .extract({ left, top, width, height })
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .composite([{ input: circleSvg, blend: "dest-in" }])
    .webp({ quality: 88 })
    .toBuffer();

  return {
    changed: true,
    stats,
    outBuf,
    crop: { left, top, width, height, side },
  };
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".webp"))
  .sort();

fs.mkdirSync(PREVIEW, { recursive: true });
if (!previewOnly) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith(".webp")) fs.unlinkSync(path.join(OUT_DIR, f));
  }
}

const previewFocus = new Set([
  "aoss.webp",
  "Chicago.webp",
  "8oi.webp",
  "xom_.webp",
  "7_c.webp",
  "_N3.webp",
  "Alphavill.webp",
  "f_6.webp",
  "0ZZ0.webp",
  "Zoooooooo6.webp",
  "sh99_.webp",
  "3yu1.webp",
  "1S7.webp",
  "LOZAR.webp",
]);

let changed = 0;
let skipped = 0;

for (const f of files) {
  if (previewOnly && !previewFocus.has(f)) continue;

  const full = path.join(DIR, f);
  const result = await normalizeFile(full);

  if (!result.changed) {
    skipped++;
    if (previewOnly) {
      await sharp(full)
        .resize(120, 120)
        .jpeg({ quality: 88 })
        .toFile(path.join(PREVIEW, `before_${f.replace(".webp", ".jpg")}`));
      console.log("skip", f, result.reason, result.stats && {
        side: result.stats.side,
        off: +result.stats.offset.toFixed(1),
        fill: +result.stats.fill.toFixed(2),
      });
    } else {
      fs.copyFileSync(full, path.join(OUT_DIR, f));
    }
    continue;
  }

  if (previewOnly) {
    await sharp(full)
      .resize(120, 120)
      .jpeg({ quality: 88 })
      .toFile(path.join(PREVIEW, `before_${f.replace(".webp", ".jpg")}`));
    await sharp(result.outBuf)
      .jpeg({ quality: 88 })
      .toFile(path.join(PREVIEW, `after_${f.replace(".webp", ".jpg")}`));
    console.log("change", f, {
      side: result.stats.side,
      off: +result.stats.offset.toFixed(1),
      fill: +result.stats.fill.toFixed(2),
      crop: result.crop.side,
    });
    changed++;
    continue;
  }

  fs.writeFileSync(path.join(OUT_DIR, f), result.outBuf);
  changed++;
}

if (!previewOnly) {
  const oldDir = path.join(root, "public/avatars/plato-old");
  if (fs.existsSync(oldDir)) {
    fs.rmSync(oldDir, { recursive: true, force: true });
  }
  try {
    fs.renameSync(DIR, oldDir);
    fs.renameSync(OUT_DIR, DIR);
    console.log("replaced", DIR, "(backup at plato-old)");
  } catch (err) {
    // إن فشل rename بسبب قفل ملفات ويندوز: انسخ فوق الملفات
    console.warn("rename failed, copying over files:", err.message);
    for (const f of files) {
      const src = path.join(OUT_DIR, f);
      const dest = path.join(DIR, f);
      fs.copyFileSync(src, dest);
    }
    console.log("copied normalized files into", DIR);
  }
}

console.log(previewOnly ? "preview done" : "normalize done", {
  changed,
  skipped,
  total: previewOnly ? previewFocus.size : files.length,
});
