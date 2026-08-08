import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const map = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/plato-avatar-map.json"), "utf8"),
);
const text = fs.readFileSync(
  path.join(root, "src/data/plato-group-usernames.ts"),
  "utf8",
);
const list = [...text.matchAll(/"([^"]+)"/g)]
  .map((m) => m[1])
  .filter(
    (n) =>
      !n.includes(" ") &&
      !n.includes("/") &&
      n.length < 48 &&
      !n.includes("يوزر") &&
      !n.includes("الإيموجي"),
  );
const uniq = [...new Set(list)];
const mapKeys = new Set(Object.keys(map));
const missing = uniq.filter((u) => !mapKeys.has(u.toLowerCase()));
console.log("list", uniq.length, "map", mapKeys.size, "missing", missing.length);
console.log("missing:", missing.join(", "));

const byFile = {};
for (const [k, v] of Object.entries(map)) {
  const f = v.avatar.split("/").pop();
  byFile[f] = (byFile[f] || []).concat(k);
}
const collisions = Object.entries(byFile).filter(([, a]) => a.length > 1);
console.log("file collisions", collisions.length);
for (const [f, users] of collisions) console.log(f, users);

const files = new Set(fs.readdirSync(path.join(root, "public/avatars/plato")));
const broken = Object.values(map).filter(
  (v) => !files.has(v.avatar.split("/").pop()),
);
console.log("broken paths", broken.length, broken.slice(0, 10));
