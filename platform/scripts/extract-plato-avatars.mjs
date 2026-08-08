/**
 * قص أفتارات قائمة قروب Plato من لقطات الشاشة وربطها باليوزرات.
 * التشغيل: node scripts/extract-plato-avatars.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS =
  "C:/Users/Alsafy/.cursor/projects/d/assets";
// نكتب للـ staging ثم ننسخ لـ plato (ويندوز يقفل المجلد أحياناً)
const OUT_DIR = path.join(__dirname, "../public/avatars/plato-normalized");
const FINAL_DIR = path.join(__dirname, "../public/avatars/plato");

/**
 * ترتيب اليوزرات من أعلى لتحت كما يظهر في كل لقطة (بعد تصحيح ربط الملفات).
 * null = صف محظور/غير عضو — يُحسب في المواضع ولا يُحفظ له أفتار.
 */
const SHOTS = [
  {
    match: "11.20.19_PM__1_",
    users: [
      "_8v",
      "_555__",
      "_A_R",
      "_AC2",
      "_doi",
      "_ef",
      "_exoxo1",
      "_Faiz8",
      "_l0l",
      "_iangel",
      "_m1lak",
      "_N3",
    ],
  },
  {
    match: "11.20.19_PM__2_",
    users: [
      "7dy",
      "i8_",
      "R4_",
      "_ah",
      "3t_h",
      "4D9",
      "4v2h",
      "7_c",
      "7hy_",
      "czxv",
      "kex",
      "LOZAR",
    ],
  },
  {
    match: "11.20.19_PM__3_",
    users: [
      "mnc",
      "vecno",
      "ZLG",
      "Zv3",
      "derrl",
      "__4",
      "__6",
      "__A",
      "_1Diana",
      "_1ip",
      "_2P",
      "_8ni",
    ],
  },
  {
    match: "11.20.19_PM-c0c04634",
    users: [
      "_nssm",
      "_nw",
      "_SLOM",
      "_Tq5",
      "_UwU_7",
      "_wy",
      "_Z0RO",
      "0RND",
      "1Aziz9",
      "1DR",
      "1n1m",
      "1o_c",
    ],
  },
  // --- تصحيح: ملفات 11.20.20 كانت مربوطة بترتيب خاطئ ---
  {
    match: "11.20.20_PM__1_",
    users: [
      "7ts_",
      "7ut_",
      "8_ae",
      "8alni1",
      "8oi",
      "8Q1",
      "8syn",
      "8WA",
      "8ZF",
      "9qd3",
      "9sky",
      "14ooct",
    ],
  },
  {
    match: "11.20.20_PM__2_",
    users: [
      "4AW",
      "4h44hy",
      "4IC",
      "4ms",
      "5a6a",
      "5GZ",
      "5lfv",
      "5SWA",
      "5xdx",
      "6a66",
      "7iik",
      "7md",
    ],
  },
  {
    match: "11.20.20_PM__3_",
    users: [
      "1S6Y",
      "1S7",
      "1TO",
      "2DA",
      "2iko",
      "2mny",
      "2XA",
      "2zvj",
      "3GY",
      "3laq",
      "3nc",
      "3yu1",
    ],
  },
  {
    match: "11.20.20_PM__4_",
    users: [
      "j3M",
      "j7t_",
      "JAMMAN_28",
      "jaxteller",
      "JQC",
      "jsa",
      "K0B",
      "k7X_",
      "k33i",
      "Khaled",
      "kiwu0",
      "Kor",
    ],
  },
  {
    match: "11.20.20_PM-1224f4b1",
    users: [
      "22i_",
      "66SD",
      "99K",
      "199K",
      "562",
      "791",
      "1166",
      "aio7",
      "Aligners",
      "aoss",
      "AU1",
      "azvv_",
    ],
  },
  // --- تصحيح: ملفات 11.20.21 ---
  {
    match: "11.20.21_PM__1_",
    users: [
      "B__1",
      "Belqis",
      "bm3k",
      "Byakuya",
      "C7E",
      "Chicago",
      "cn_",
      "CnL",
      "copperdots36",
      "doistf",
      "E3N",
      "efiy",
    ],
  },
  {
    match: "11.20.21_PM__2_",
    users: [
      "era5",
      "eym",
      "f1rh0_",
      "f15u",
      "fa_3_37",
      "Fged",
      "firnosa2",
      "FLK",
      "Fly",
      "FRR",
      "fuvl",
      "fv_",
    ],
  },
  {
    match: "11.20.21_PM__3_",
    users: [
      "rrssr",
      "rrssr2",
      "rswo",
      "Ry7w4",
      "s9s",
      "sadk_24",
      "sc7q",
      "sh99_",
      "Shalahi",
      "sl_o",
      "Suv",
      "TOLIB",
    ],
  },
  {
    match: "11.20.21_PM__4_",
    users: [
      "ojz5",
      "Oldghost",
      "oo8_",
      "P1N",
      "Pachytene",
      "Pci",
      "PP__",
      "proro_",
      "QSF",
      "R0ZZE",
      "reeiir",
      "rreiimm",
    ],
  },
  {
    match: "11.20.21_PM__5_",
    users: [
      "Maher___",
      "me_r",
      "mm_4rr",
      "Mouunib",
      "MQE",
      "mralex87",
      "N0NAR",
      "nadr",
      "NINIb",
      "Nlux",
      "nvh",
      "oevc2",
    ],
  },
  {
    match: "11.20.21_PM-f316b717",
    users: [
      "Gsr",
      "h__z__3",
      "hanhona0",
      "Howiscare",
      "huq_p",
      "hxt",
      "i4du",
      "IEFR",
      "ifw",
      "injurybrin22",
      "ir0_",
      "izo",
    ],
  },
  // --- تصحيح: ملفات 11.20.22 ---
  {
    match: "11.20.22_PM__1_",
    users: [
      "t7g70",
      "t7o",
      "Talal_222",
      "TH9",
      "thoriia",
      "tuhiey",
      "TVM",
      "u0_",
      "uiwu",
      "Uzk",
      "uzz",
      "V00",
    ],
  },
  {
    match: "11.20.22_PM__2_",
    users: [
      "v6_j",
      "VLC",
      "vNawaf505",
      "VORI",
      "vuur",
      null, // مستخدم محظور
      "wsur",
      "WXF",
      "x2zaf",
      "xges",
      "xlz7l",
      "xN6N",
    ],
  },
  {
    match: "11.20.22_PM__3_",
    users: [
      "xom_",
      "xru1i",
      "xsosox",
      "Y7_",
      "yass_inedj",
      "yv71",
      "Zak_Y10",
      "zflv",
      "Zhoo_29",
      "zin_",
      "Zitay",
      "zkx7",
    ],
  },
  {
    match: "11.20.22_PM__4_",
    users: [
      "Y7_",
      "yass_inedj",
      "yv71",
      "Zak_Y10",
      "zflv",
      "Zhoo_29",
      "zin_",
      "Zitay",
      "zkx7",
      "zlpr",
      "Zoooooooo6",
    ],
  },
  {
    match: "11.20.22_PM-927da7f8",
    users: [
      "kqen",
      "L0ND",
      "l2lee_",
      "l11irre",
      "L3O0",
      "LeoMeesi",
      "lixr",
      "llBR",
      "lmr08",
      "lollyy19_",
      "lS1",
      "M_Z",
    ],
  },
];

/** اسم ملف فريد يحافظ على الشرطات السفلية */
function slug(username) {
  const key = String(username)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_");
  return (key || "user").slice(0, 64);
}

function cellScore(data, w, h, ch, cx, cy, r) {
  let sum = 0;
  let sum2 = 0;
  let nn = 0;
  let dark = 0;
  let edgeSum = 0;
  let en = 0;
  const rIn = (r - 1) * (r - 1);
  const rOutLo = (r + 1) * (r + 1);
  const rOutHi = (r + 4) * (r + 4);
  for (let dy = -r - 3; dy <= r + 3; dy++) {
    for (let dx = -r - 3; dx <= r + 3; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const d2 = dx * dx + dy * dy;
      const i = (y * w + x) * ch;
      const L = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      if (d2 <= rIn) {
        sum += L;
        sum2 += L * L;
        nn++;
        if (L < 12) dark++;
      } else if (d2 >= rOutLo && d2 <= rOutHi) {
        edgeSum += L;
        en++;
      }
    }
  }
  if (nn < 20) return -1e9;
  const mean = sum / nn;
  const vari = sum2 / nn - mean * mean;
  const out = en ? edgeSum / en : 50;
  return (
    Math.sqrt(Math.max(vari, 0)) * 2 +
    mean * 0.15 +
    (out < 35 ? 35 - out : -(out - 35)) -
    (dark / nn > 0.92 ? 300 : 0)
  );
}

function refineCenter(data, w, h, ch, cx0, cy0, r0) {
  let best = { cx: cx0, cy: cy0, r: r0, s: -1e9 };
  for (let r = Math.max(18, r0 - 5); r <= r0 + 2; r++) {
    for (let cy = cy0 - 16; cy <= cy0 + 16; cy++) {
      for (let cx = cx0 - 14; cx <= cx0 + 12; cx++) {
        const s = cellScore(data, w, h, ch, cx, cy, r);
        if (s > best.s) best = { cx, cy, r, s };
      }
    }
  }
  return best;
}

function fitEqualLayout(data, w, h, ch, count, r, cx0) {
  let best = { s: -1e18, first: 0, gap: 0 };
  const minFirst = Math.round(h * 0.1);
  const maxFirst = Math.round(h * 0.2);
  const minGap = Math.max(48, Math.round((h * 0.55) / Math.max(count, 1)));
  const maxGap = Math.round((h * 0.85) / Math.max(count - 1, 1));

  for (let first = minFirst; first <= maxFirst; first += 0.5) {
    for (let gap = minGap; gap <= maxGap; gap += 0.25) {
      const last = first + gap * (count - 1);
      if (last + r >= h - 2) continue;
      if (last < h * 0.55 && count >= 8) continue;
      let s = 0;
      for (let i = 0; i < count; i++) {
        s += cellScore(data, w, h, ch, cx0, Math.round(first + gap * i), r);
      }
      if (s > best.s) best = { s, first, gap };
    }
  }
  return best;
}

async function extractFromShot(filePath, users) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const count = users.length;
  if (!count) return [];

  const r = Math.max(
    22,
    Math.min(32, Math.round(Math.min(w * 0.06, h / (count * 2.6)))),
  );
  const cx0 = Math.round(w - r - 8);

  let layout = fitEqualLayout(data, w, h, ch, count, r, cx0);
  if (!Number.isFinite(layout.s) || layout.s < -1e17) {
    // احتياطي: تقسيم منتظم تحت الهيدر
    const topPad = Math.round(h * 0.12);
    const bottomPad = Math.round(h * 0.03);
    const usable = h - topPad - bottomPad;
    layout = {
      s: 0,
      first: topPad + usable / count / 2,
      gap: usable / count,
    };
  }

  const results = [];
  for (let i = 0; i < count; i++) {
    const username = users[i];
    // null = صف محظور: نحسب موضعه فقط
    if (username == null || username === "") continue;

    const cy0 = Math.round(layout.first + layout.gap * i);
    const c = refineCenter(data, w, h, ch, cx0, cy0, r);
    // قص أضيق قليلاً عشان الوجه يملأ الدائرة بدون حشوة القائمة
    const rr = Math.max(18, Math.round(c.r * 0.92));
    const size = rr * 2;
    const left = Math.max(0, Math.min(w - size, Math.round(c.cx - rr)));
    const top = Math.max(0, Math.min(h - size, Math.round(c.cy - rr)));

    const fname = `${slug(username)}.webp`;
    const outPath = path.join(OUT_DIR, fname);
    const circleSvg = Buffer.from(
      `<svg width="128" height="128"><circle cx="64" cy="64" r="64" fill="white"/></svg>`,
    );

    await sharp(filePath)
      .extract({ left, top, width: size, height: size })
      .resize(128, 128)
      .composite([{ input: circleSvg, blend: "dest-in" }])
      .webp({ quality: 88 })
      .toFile(outPath);

    results.push({
      username,
      avatar: `/avatars/plato/${fname}`,
    });
  }
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(FINAL_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith(".webp")) fs.unlinkSync(path.join(OUT_DIR, f));
  }

  // احتفظ بأفتارات الملفات الشخصية المضافة يدوياً
  const keep = ["0ZZ0.webp", "Alphavill.webp", "f_6.webp"];
  for (const f of keep) {
    const src = path.join(FINAL_DIR, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT_DIR, f));
  }

  const files = fs
    .readdirSync(ASSETS)
    .filter((f) => f.includes("WhatsApp_Image_2026-08-05"));
  const map = {};
  const prevMapPath = path.join(__dirname, "../src/data/plato-avatar-map.json");
  const prevMap = fs.existsSync(prevMapPath)
    ? JSON.parse(fs.readFileSync(prevMapPath, "utf8"))
    : {};

  for (const shot of SHOTS) {
    const file = files.find((f) => f.includes(shot.match));
    if (!file) {
      console.warn("missing shot", shot.match);
      continue;
    }
    const full = path.join(ASSETS, file);
    const named = shot.users.filter((u) => u != null && u !== "");
    console.log("processing", shot.match, "→", named.length, "avatars");
    try {
      const rows = await extractFromShot(full, shot.users);
      for (const r of rows) map[r.username.toLowerCase()] = r;
    } catch (e) {
      console.error("fail", file, e.message);
    }
  }

  // مرادفات إملائية لحسابات مستوردة سابقاً بتهجئة خاطئة
  const aliases = {
    _i0l_: "_l0l",
    zlfv: "zflv",
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (map[canonical] && !map[alias]) {
      map[alias] = {
        username: alias,
        avatar: map[canonical].avatar,
      };
    }
  }

  // أعد دمج الأفتارات اليدوية
  for (const key of ["0zz0", "alphavill", "f_6"]) {
    if (prevMap[key]) map[key] = prevMap[key];
  }

  const manifestPath = path.join(__dirname, "../src/data/plato-avatar-map.json");
  fs.writeFileSync(manifestPath, JSON.stringify(map, null, 2), "utf8");
  console.log("wrote", Object.keys(map).length, "avatars →", manifestPath);

  console.log("staging ready with", fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp")).length, "files");
  console.log("run PowerShell copy into", FINAL_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
