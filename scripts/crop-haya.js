const sharp = require("sharp");
const path = require("path");

const src = path.join(__dirname, "..", "public", "images", "members", "haya-src.png");
const out = path.join(__dirname, "..", "public", "images", "members", "haya.png");

(async () => {
  const meta = await sharp(src).metadata();
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const yLimit = Math.floor(h * 0.62);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 4; y < yLimit; y++) {
    for (let x = 20; x < w - 20; x++) {
      const i = (y * w + x) * info.channels;
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (sum < 60) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const sizeRaw = Math.min(maxX - minX + 1, maxY - minY + 1);
  const inset = Math.round(sizeRaw * 0.07);
  const size = sizeRaw - inset * 2;
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const left = Math.max(0, cx - Math.floor(size / 2));
  const top = Math.max(0, cy - Math.floor(size / 2) + Math.round(size * 0.02));

  console.log({ meta: `${meta.width}x${meta.height}`, left, top, size, bounds: { minX, minY, maxX, maxY } });

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

  console.log("haya avatar ready");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
