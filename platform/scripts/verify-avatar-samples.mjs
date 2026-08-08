import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const map = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/plato-avatar-map.json"), "utf8"),
);
const out = path.join(root, "tmp-verify");
fs.mkdirSync(out, { recursive: true });

const samples = [
  "7ts_",
  "kqen",
  "Zoooooooo6",
  "xom_",
  "1S6Y",
  "j3M",
  "rrssr",
  "B__1",
  "L0ND",
  "zlpr",
  "_l0l",
  "i8_",
  "mnc",
  "wsur",
  "xN6N",
];

for (const u of samples) {
  const e = map[u.toLowerCase()];
  if (!e) {
    console.log("MISSING", u);
    continue;
  }
  const src = path.join(root, "public", e.avatar.replace(/^\//, ""));
  const dest = path.join(out, `${u.replace(/[^\w.-]/g, "_")}.jpg`);
  await sharp(src).jpeg({ quality: 90 }).toFile(dest);
  console.log("ok", u, "→", e.avatar);
}
