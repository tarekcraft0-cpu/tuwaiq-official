const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "public", "images", "members", "tariq-src.png");
const out = path.join(__dirname, "..", "public", "images", "members", "tariq.png");

(async () => {
  const meta = await sharp(src).metadata();
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);

  const circle = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );

  const buf = await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(512, 512, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  await sharp(buf)
    .ensureAlpha()
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toFile(out);

  console.log("tariq avatar ready", `${meta.width}x${meta.height}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
