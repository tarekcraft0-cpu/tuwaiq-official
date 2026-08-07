const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src =
  "C:/Users/Alsafy/.cursor/projects/c-Users-Alsafy-Downloads/assets/c__Users_Alsafy_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-08-07_at_11.57.45_PM-336f391f-2d7e-4484-9608-314e0349e253.png";
const outDir = path.join(__dirname, "..", "public", "images", "members");
const outFile = path.join(outDir, "meshal.png");

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const meta = await sharp(src).metadata();

  // Plato avatar photo core — tight box inside the circle, below the white UI lines
  const size = 96;
  const left = Math.round((meta.width - size) / 2);
  const top = 278;

  const photoBuf = await sharp(src)
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, { fit: "cover", position: "centre", kernel: "lanczos3" })
    .modulate({ brightness: 1.05, saturation: 1.08 })
    .sharpen()
    .png()
    .toBuffer();

  const circleSvg = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );

  await sharp(photoBuf)
    .ensureAlpha()
    .composite([{ input: circleSvg, blend: "dest-in" }])
    .png()
    .toFile(outFile);

  console.log("meshal.png ready");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
