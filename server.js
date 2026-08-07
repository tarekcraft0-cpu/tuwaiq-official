const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const PORT = Number(process.env.PORT) || 3847;
const ADMIN_KEY = process.env.ADMIN_KEY || "tuwaiq-admin-change-me";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "db.seed.json");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    if (fs.existsSync(SEED_PATH)) {
      fs.copyFileSync(SEED_PATH, DB_PATH);
      return;
    }
    const initial = {
      site: {
        name: "طويق",
        tagline: "الموقع الرسمي لأعضاء قروب طويق",
      },
      members: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.body?.adminKey;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "غير مصرح" });
  }
  next();
}

app.get("/api/site", (_req, res) => {
  const db = readDb();
  res.json({
    name: db.site.name,
    tagline: db.site.tagline,
    memberCount: db.members.length,
  });
});

app.get("/api/members", (_req, res) => {
  const db = readDb();
  const members = db.members
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const opinions = (m.opinions || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return {
        id: m.id,
        username: m.username,
        displayName: m.displayName,
        role: m.role,
        title: m.title || null,
        bio: m.bio,
        avatar: m.avatar || null,
        flag: m.flag || null,
        avatarInitial: (m.displayName || m.username || "?").trim().charAt(0),
        opinionCount: opinions.length,
        opinions,
        createdAt: m.createdAt,
      };
    });
  res.json(members);
});

app.get("/api/members/:id", (req, res) => {
  const db = readDb();
  const member = db.members.find((m) => m.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: "العضو غير موجود" });
  }
  res.json({
    id: member.id,
    username: member.username,
    displayName: member.displayName,
    role: member.role,
    title: member.title || null,
    bio: member.bio,
    avatar: member.avatar || null,
    flag: member.flag || null,
    opinions: (member.opinions || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

app.post("/api/members", requireAdmin, (req, res) => {
  const { username, displayName, role, title, bio, order, avatar, flag } = req.body || {};
  if (!username || !String(username).trim()) {
    return res.status(400).json({ error: "اسم الحساب مطلوب" });
  }

  const db = readDb();
  const exists = db.members.some(
    (m) => m.username.toLowerCase() === String(username).trim().toLowerCase()
  );
  if (exists) {
    return res.status(409).json({ error: "هذا الحساب موجود مسبقاً" });
  }

  const member = {
    id: randomUUID(),
    username: String(username).trim(),
    displayName: String(displayName || username).trim(),
    role: String(role || "عضو").trim(),
    title: title ? String(title).trim() : null,
    bio: String(bio || "").trim(),
    avatar: avatar ? String(avatar).trim() : null,
    flag: flag ? String(flag).trim() : null,
    order: Number.isFinite(order) ? order : db.members.length + 1,
    opinions: [],
    createdAt: new Date().toISOString(),
  };

  db.members.push(member);
  writeDb(db);
  res.status(201).json(member);
});

app.post("/api/members/:id/opinions", (req, res) => {
  const { author, text, verdict } = req.body || {};
  const cleanText = String(text || "").trim();
  const cleanAuthor = String(author || "زائر").trim().slice(0, 40) || "زائر";
  const cleanVerdict = verdict === "false" ? "false" : verdict === "true" ? "true" : null;

  if (!cleanText || cleanText.length < 3) {
    return res.status(400).json({ error: "اكتب رأيك (٣ أحرف على الأقل)" });
  }
  if (cleanText.length > 500) {
    return res.status(400).json({ error: "الرأي طويل جداً (حد أقصى ٥٠٠ حرف)" });
  }
  if (!cleanVerdict) {
    return res.status(400).json({ error: "اختر: حقيقي أو غير حقيقي" });
  }

  const db = readDb();
  const member = db.members.find((m) => m.id === req.params.id);
  if (!member) {
    return res.status(404).json({ error: "العضو غير موجود" });
  }

  const opinion = {
    id: randomUUID(),
    author: cleanAuthor,
    text: cleanText,
    verdict: cleanVerdict,
    createdAt: new Date().toISOString(),
  };

  member.opinions = member.opinions || [];
  member.opinions.push(opinion);
  writeDb(db);
  res.status(201).json(opinion);
});

app.delete("/api/members/:id", requireAdmin, (req, res) => {
  const db = readDb();
  const before = db.members.length;
  db.members = db.members.filter((m) => m.id !== req.params.id);
  if (db.members.length === before) {
    return res.status(404).json({ error: "العضو غير موجود" });
  }
  writeDb(db);
  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDb();
app.listen(PORT, () => {
  console.log(`سيرفر طويق الرسمي يعمل على http://localhost:${PORT}`);
  console.log(`منفذ مخصص: ${PORT} — قاعدة بيانات مستقلة في /data`);
});
