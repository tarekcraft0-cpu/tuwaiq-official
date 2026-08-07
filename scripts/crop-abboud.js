const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "public", "images", "members", "abboud-src.png");
const out = path.join(__dirname, "..", "public", "images", "members", "abboud.png");

(async () => {
  // Manual crop locked to the circular avatar in the source (601x483)
  // Keeps the face + hand filling the circle, cuts stars/text/black rim
  const left = 168;
  const top = 28;
  const size = 268;

  const circleMask = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );

  const buf = await sharp(src)
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, {
      fit: "cover",
      position: "attention",
      kernel: "lanczos3",
    })
    .modulate({ brightness: 1.04, saturation: 1.05 })
    .sharpen()
    .png()
    .toBuffer();

  await sharp(buf)
    .ensureAlpha()
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toFile(out);

  // cleanup temp previews
  for (const name of ["abboud-tight.png", "abboud-wide.png"]) {
    const p = path.join(__dirname, "..", "public", "images", "members", name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("abboud avatar fixed", { left, top, size });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
