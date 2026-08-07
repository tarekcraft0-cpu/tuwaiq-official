const sharp = require("sharp");
const path = require("path");

const src = process.argv[2];
const out = path.join(__dirname, "..", "public", "images", "members", "rami.png");

(async () => {
  const meta = await sharp(src).metadata();
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const yLimit = Math.floor(h * 0.72);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 8; y < yLimit; y++) {
    for (let x = 20; x < w - 20; x++) {
      const i = (y * w + x) * info.channels;
      if (data[i] + data[i + 1] + data[i + 2] < 55) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const sizeRaw = Math.min(maxX - minX + 1, maxY - minY + 1);
  const inset = Math.round(sizeRaw * 0.08);
  const size = sizeRaw - inset * 2;
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const left = Math.max(0, cx - Math.floor(size / 2));
  const top = Math.max(0, cy - Math.floor(size / 2) + Math.round(size * 0.02));

  const mask = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );

  const buf = await sharp(src)
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  await sharp(buf)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(out);

  console.log("rami ready", { left, top, size, meta: `${meta.width}x${meta.height}` });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
