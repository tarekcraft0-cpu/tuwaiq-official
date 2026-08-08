import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "public/avatars/plato");
const TMP = path.join(root, "tmp-new");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const ASSETS = "C:/Users/Alsafy/.cursor/projects/d/assets";
const username = "f_6";
const file =
  "c__Users_Alsafy_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-08-06_at_1.36.09_AM-2daf0927-3333-47d3-bb71-ec82ba1482fe.png";
const full = path.join(ASSETS, file);

async function findCircle(imgPath) {
  const { data, info } = await sharp(imgPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  let best = { s: -1e9, cx: 0, cy: 0, r: 0 };

  for (let r = 55; r <= 100; r += 2) {
    for (let cy = Math.round(h * 0.18); cy <= Math.round(h * 0.45); cy += 3) {
      for (let cx = Math.round(w * 0.35); cx <= Math.round(w * 0.65); cx += 3) {
        let edge = 0;
        let en = 0;
        let inSum = 0;
        let inSum2 = 0;
        let inN = 0;
        for (let a = 0; a < 360; a += 8) {
          const rad = (a * Math.PI) / 180;
          const xi = Math.round(cx + (r - 3) * Math.cos(rad));
          const yi = Math.round(cy + (r - 3) * Math.sin(rad));
          const xo = Math.round(cx + (r + 4) * Math.cos(rad));
          const yo = Math.round(cy + (r + 4) * Math.sin(rad));
          if (
            xi < 0 ||
            yi < 0 ||
            xi >= w ||
            yi >= h ||
            xo < 0 ||
            yo < 0 ||
            xo >= w ||
            yo >= h
          )
            continue;
          const ii = (yi * w + xi) * ch;
          const oo = (yo * w + xo) * ch;
          const Li = data[ii] * 0.3 + data[ii + 1] * 0.59 + data[ii + 2] * 0.11;
          const Lo = data[oo] * 0.3 + data[oo + 1] * 0.59 + data[oo + 2] * 0.11;
          edge += Math.abs(Li - Lo);
          en++;
        }
        for (let dy = -r; dy <= r; dy += 3) {
          for (let dx = -r; dx <= r; dx += 3) {
            if (dx * dx + dy * dy > r * r) continue;
            const x = cx + dx;
            const y = cy + dy;
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const i = (y * w + x) * ch;
            const L = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
            inSum += L;
            inSum2 += L * L;
            inN++;
          }
        }
        if (inN < 20 || en < 10) continue;
        const mean = inSum / inN;
        const vari = inSum2 / inN - mean * mean;
        const s = (edge / en) * 2 + Math.sqrt(Math.max(vari, 0)) * 0.5 + mean * 0.1;
        if (s > best.s) best = { s, cx, cy, r };
      }
    }
  }
  return best;
}

const best = await findCircle(full);
console.log(username, best);

const meta = await sharp(full).metadata();
const w = meta.width || 472;
const h = meta.height || 1024;
const size = best.r * 2;
const left = Math.max(0, best.cx - best.r);
const top = Math.max(0, best.cy - best.r);
const circle = Buffer.from(
  `<svg width="128" height="128"><circle cx="64" cy="64" r="64" fill="white"/></svg>`,
);
const outName = `${username}.webp`;

await sharp(full)
  .extract({
    left,
    top,
    width: Math.min(size, w - left),
    height: Math.min(size, h - top),
  })
  .resize(128, 128)
  .composite([{ input: circle, blend: "dest-in" }])
  .webp({ quality: 88 })
  .toFile(path.join(OUT, outName));

await sharp(full)
  .extract({
    left,
    top,
    width: Math.min(size, w - left),
    height: Math.min(size, h - top),
  })
  .resize(160, 160)
  .jpeg({ quality: 90 })
  .toFile(path.join(TMP, `${username}.jpg`));

const avatar = `/avatars/plato/${outName}`;
const mapPath = path.join(root, "src/data/plato-avatar-map.json");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
map[username.toLowerCase()] = { username, avatar };
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), "utf8");

const usersPath = path.join(root, "src/data/plato-group-usernames.ts");
let usersTs = fs.readFileSync(usersPath, "utf8");
if (!usersTs.includes(`"${username}"`)) {
  usersTs = usersTs.replace(
    "export const PLATO_GROUP_USERNAMES: string[] = [",
    `export const PLATO_GROUP_USERNAMES: string[] = [\n  "${username}",`,
  );
  fs.writeFileSync(usersPath, usersTs, "utf8");
}

console.log("saved", avatar);
