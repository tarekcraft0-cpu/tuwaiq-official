const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "public", "images", "members", "meshal-src.png");
const out = path.join(__dirname, "..", "public", "images", "members", "meshal.png");
const outDir = path.dirname(out);

(async () => {
  const meta = await sharp(src).metadata();
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Detect non-black content in the upper area only (avatar circle, ignore username)
  const yLimit = Math.floor(h * 0.62);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 8; y < yLimit; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * info.channels;
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (sum < 55) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const sizeRaw = Math.min(width, height);
  // Pull inward to drop Plato rim/white lines
  const inset = Math.round(sizeRaw * 0.08);
  const size = sizeRaw - inset * 2;
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const left = Math.max(0, cx - Math.floor(size / 2));
  // Bias slightly downward to avoid top UI lines
  const top = Math.max(0, cy - Math.floor(size / 2) + Math.round(size * 0.03));

  console.log({ meta: `${meta.width}x${meta.height}`, bounds: { minX, minY, maxX, maxY }, left, top, size });

  const candidates = [
    { name: "meshal.png", dLeft: 0, dTop: 0, dSize: 0 },
    { name: "meshal-a.png", dLeft: 4, dTop: 8, dSize: -10 },
    { name: "meshal-b.png", dLeft: 8, dTop: 12, dSize: -18 },
  ];

  const mask = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );

  for (const c of candidates) {
    const s = size + c.dSize;
    const l = left + c.dLeft;
    const t = top + c.dTop;
    const buf = await sharp(src)
      .extract({ left: l, top: t, width: s, height: s })
      .resize(512, 512, { kernel: "lanczos3" })
      .png()
      .toBuffer();

    await sharp(buf)
      .ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toFile(path.join(outDir, c.name));

    console.log("wrote", c.name, { l, t, s });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
