import fs from "fs";
import path from "path";

export type SiteOpinion = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  verdict?: "true" | "false";
};

export type SiteMember = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  opinions: SiteOpinion[];
};

export type SiteDb = {
  site?: { name?: string; tagline?: string; visitCount?: number };
  members: SiteMember[];
  groupOpinions: SiteOpinion[];
};

function dbPath() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dir, "db.json");
}

export function readSiteDb(): SiteDb {
  const file = dbPath();
  if (!fs.existsSync(file)) {
    return { members: [], groupOpinions: [] };
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as SiteDb;
  return {
    site: raw.site,
    members: Array.isArray(raw.members) ? raw.members : [],
    groupOpinions: Array.isArray(raw.groupOpinions) ? raw.groupOpinions : [],
  };
}

export function writeSiteDb(db: SiteDb) {
  const file = dbPath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, file);
}
