import {
  createEmptyPlayer,
  mergePlayersPreferProgress,
  normalizePlayer,
  playerProgressScore,
} from "@/lib/data";
import { hashPassword, publicPlayer } from "@/lib/auth-server";
import { pickPreferredBracket } from "@/lib/bracket-stable";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import platoAvatarMap from "@/data/plato-avatar-map.json";
import type {
  HallOfFameEntry,
  NewsItem,
  NotificationItem,
  Player,
  Tournament,
  UserRole,
  Vote,
} from "@/lib/types";

type AvatarMapEntry = { username: string; avatar: string };

function avatarForUsername(username: string): string | undefined {
  const entry = (platoAvatarMap as Record<string, AvatarMapEntry>)[
    username.toLowerCase()
  ];
  return entry?.avatar;
}

export type StoreSnapshot = {
  players: Player[];
  tournaments: Tournament[];
  votes: Vote[];
  news: NewsItem[];
  notifications: NotificationItem[];
  hallOfFame: HallOfFameEntry[];
};

export async function getStoreSnapshot(): Promise<StoreSnapshot> {
  const db = getSupabaseAdmin();

  const [profiles, tournaments, votes, news, notifications, hall] =
    await Promise.all([
      db.from("profiles").select("id, username, data"),
      db.from("tournaments").select("id, data"),
      db.from("votes").select("id, data"),
      db.from("news").select("id, data"),
      db.from("notifications").select("id, data"),
      db.from("hall_of_fame").select("id, data"),
    ]);

  if (profiles.error) throw profiles.error;
  if (tournaments.error) throw tournaments.error;
  if (votes.error) throw votes.error;
  if (news.error) throw news.error;
  if (notifications.error) throw notifications.error;
  if (hall.error) throw hall.error;

  return {
    players: (profiles.data ?? []).map((row) =>
      publicPlayer(
        normalizePlayer({
          ...(row.data as Partial<Player>),
          id: row.id,
          username: row.username,
          password: "",
        }),
      ),
    ),
    tournaments: (tournaments.data ?? [])
      .map((row) => ({ id: row.id, ...(row.data as object) }) as Tournament)
      .filter((t) => !t.deleted),
    votes: (votes.data ?? []).map(
      (row) => ({ id: row.id, ...(row.data as object) }) as Vote,
    ),
    news: (news.data ?? []).map(
      (row) => ({ id: row.id, ...(row.data as object) }) as NewsItem,
    ),
    notifications: (notifications.data ?? []).map(
      (row) =>
        ({ id: row.id, ...(row.data as object) }) as NotificationItem,
    ),
    hallOfFame: (hall.data ?? []).map(
      (row) =>
        ({ id: row.id, ...(row.data as object) }) as HallOfFameEntry,
    ),
  };
}

export async function findProfileByUsername(username: string) {
  const db = getSupabaseAdmin();
  const name = username.trim();
  if (!name) return null;

  const exact = await db
    .from("profiles")
    .select("id, username, password_hash, data")
    .eq("username", name)
    .maybeSingle();
  if (exact.error) throw exact.error;
  if (exact.data) return exact.data;

  // بحث غير حساس لحالة الأحرف مع تهريب رموز LIKE
  const escaped = name
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const { data, error } = await db
    .from("profiles")
    .select("id, username, password_hash, data")
    .ilike("username", escaped)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findProfileById(id: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("profiles")
    .select("id, username, password_hash, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function mergeRole(
  existing: string | undefined,
  incoming: string | undefined,
): UserRole {
  // الرتبة تُدار من السيرفر (منح/سحب مشرف) — المزامنة ما تغيّرها
  if (existing === "owner") return "owner";
  if (existing === "admin" || existing === "member") {
    return existing;
  }
  if (incoming === "owner" || incoming === "admin" || incoming === "member") {
    return incoming;
  }
  return "member";
}

/** منح أو سحب صلاحية مشرف — للمالك فقط عبر API */
export async function setProfileRole(
  profileId: string,
  role: "admin" | "member",
) {
  const row = await findProfileById(profileId);
  if (!row) return { ok: false as const, error: "الحساب غير موجود" };

  const current = {
    id: row.id,
    username: row.username,
    ...(row.data as object),
  } as Player;

  if (current.role === "owner") {
    return { ok: false as const, error: "لا يمكن تعديل صلاحية المالك" };
  }

  const badges = (current.badges ?? []).filter(
    (b) => b !== "مشرف" && b !== "المالك",
  );
  if (role === "admin") badges.push("مشرف");

  const next: Player = {
    ...current,
    password: "",
    role,
    rank: role === "admin" ? "مشرف" : current.rank === "مشرف" ? "مبتدئ" : current.rank,
    badges,
  };

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("profiles")
    .update({
      data: { ...next, password: "" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (error) throw error;

  return { ok: true as const, player: next };
}

export async function createProfile(player: Player, plainPassword: string) {
  const db = getSupabaseAdmin();
  const password_hash = await hashPassword(plainPassword);
  const { password: _pw, ...rest } = player;
  const { error } = await db.from("profiles").insert({
    id: player.id,
    username: player.username,
    password_hash,
    data: { ...rest, password: "" },
  });
  if (error) throw error;
}

/** يجد الحساب أو ينشئه تلقائياً (غير مفعّل) عند التسجيل بيوزر جديد */
export async function ensureUnclaimedProfile(username: string) {
  const name = username.trim().replace(/^@/, "");
  if (name.length < 2 || name.length > 32) {
    return {
      ok: false as const,
      error: "اليوزر لازم يكون بين حرفين و32 حرف",
    };
  }
  if (/\s/.test(name)) {
    return { ok: false as const, error: "اليوزر ما يقدر يحتوي مسافات" };
  }

  const existing = await findProfileByUsername(name);
  if (existing) {
    return { ok: true as const, profile: existing, created: false as const };
  }

  const avatar = avatarForUsername(name) || "/logo.png";
  const player = createEmptyPlayer(name, "", avatar);
  player.id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  player.unclaimed = true;
  player.badges = ["عضو جديد"];
  const { password: _pw, ...rest } = player;
  const password_hash = await hashPassword(`!unclaimed!${player.id}`);
  const db = getSupabaseAdmin();
  const { error } = await db.from("profiles").insert({
    id: player.id,
    username: player.username,
    password_hash,
    data: { ...rest, password: "", unclaimed: true },
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // سباق نادر: انخلق بنفس الوقت
    const again = await findProfileByUsername(name);
    if (again) {
      return { ok: true as const, profile: again, created: false as const };
    }
    throw error;
  }

  return {
    ok: true as const,
    profile: {
      id: player.id,
      username: player.username,
      password_hash,
      data: { ...rest, password: "", unclaimed: true },
    },
    created: true as const,
  };
}

function parseUsernameList(raw: string[] | string) {
  const text = Array.isArray(raw) ? raw.join("\n") : String(raw || "");
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of text.split(/[\n,;]+/)) {
    const name = line.trim().replace(/^@/, "");
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** استيراد يوزرات القروب كحسابات جاهزة (بانتظار تعيين كلمة المرور) */
export async function importUnclaimedProfiles(rawUsernames: string[] | string) {
  const db = getSupabaseAdmin();
  const names = parseUsernameList(rawUsernames);
  if (!names.length) {
    return { created: [] as string[], skipped: [] as string[], total: 0 };
  }

  const { data: existingRows, error: readError } = await db
    .from("profiles")
    .select("username");
  if (readError) throw readError;

  const existing = new Set(
    (existingRows ?? []).map((r) => String(r.username).toLowerCase()),
  );

  const created: string[] = [];
  const skipped: string[] = [];
  const rows: {
    id: string;
    username: string;
    password_hash: string;
    data: Record<string, unknown>;
    updated_at: string;
  }[] = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    if (existing.has(name.toLowerCase())) {
      skipped.push(name);
      continue;
    }
    const avatar = avatarForUsername(name) || "/logo.png";
    const player = createEmptyPlayer(name, "", avatar);
    player.id = `p-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    player.unclaimed = true;
    player.badges = ["عضو القروب"];
    const { password: _pw, ...rest } = player;
    const password_hash = await hashPassword(`!unclaimed!${player.id}`);
    rows.push({
      id: player.id,
      username: player.username,
      password_hash,
      data: { ...rest, password: "", unclaimed: true },
      updated_at: new Date().toISOString(),
    });
    created.push(name);
    existing.add(name.toLowerCase());
  }

  // دفعات حتى لا يثقل الطلب
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40);
    const { error } = await db.from("profiles").upsert(chunk);
    if (error) throw error;
  }

  return { created, skipped, total: names.length };
}

/** تطبيق أفتارات القروب المحفوظة على الحسابات الموجودة */
export async function applyPlatoAvatars(options?: {
  overwriteCustom?: boolean;
}) {
  const db = getSupabaseAdmin();
  const overwriteCustom = Boolean(options?.overwriteCustom);
  const { data: rows, error } = await db
    .from("profiles")
    .select("id, username, data");
  if (error) throw error;

  let updated = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const username = String(row.username || "");
    const mapped = avatarForUsername(username);
    if (!mapped) {
      skipped++;
      continue;
    }
    const data = (row.data || {}) as Partial<Player> & Record<string, unknown>;
    const current = typeof data.avatar === "string" ? data.avatar.trim() : "";
    const isPlaceholder = !current || current === "/logo.png";
    const isPlatoAvatar = current.startsWith("/avatars/plato/");
    // نصلح أيضاً مسارات plato القديمة/المكسورة (اختلاف اسم الملف)
    if (!overwriteCustom && !isPlaceholder && !isPlatoAvatar) {
      skipped++;
      continue;
    }
    if (current === mapped) {
      skipped++;
      continue;
    }
    const nextData = { ...data, avatar: mapped };
    const { error: upErr } = await db
      .from("profiles")
      .update({
        data: nextData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated++;
  }

  return { updated, skipped, total: rows?.length ?? 0 };
}

/** تعيين كلمة مرور لأول مرة لحساب مستورد من القروب */
export async function claimUnclaimedProfile(
  username: string,
  plainPassword: string,
) {
  const row = await findProfileByUsername(username);
  if (!row) return { ok: false as const, error: "اليوزر غير موجود في قائمة القروب" };

  const data = (row.data || {}) as Partial<Player>;
  if (!data.unclaimed) {
    return {
      ok: false as const,
      error: "هذا الحساب مفعّل مسبقاً — سجّل الدخول بكلمة المرور",
      claimed: true as const,
    };
  }

  const db = getSupabaseAdmin();
  const password_hash = await hashPassword(plainPassword);
  const nextData = {
    ...data,
    id: row.id,
    username: row.username,
    password: "",
    unclaimed: false,
  };
  const { error } = await db
    .from("profiles")
    .update({
      password_hash,
      data: nextData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw error;

  const player = publicPlayer(
    normalizePlayer({
      ...(nextData as Partial<Player>),
      id: row.id,
      username: row.username,
      password: "",
      unclaimed: false,
    }),
  );

  return { ok: true as const, player };
}

function isRealAvatar(avatar?: string | null) {
  if (!avatar || typeof avatar !== "string") return false;
  const v = avatar.trim();
  if (!v || v === "/logo.png") return false;
  return (
    v.startsWith("data:image/") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    (v.startsWith("/") && v !== "/logo.png")
  );
}

export async function upsertPlayers(players: Player[]) {
  const db = getSupabaseAdmin();
  // Keep existing password hashes unless a new plaintext password is provided
  const existing = await db.from("profiles").select("id, password_hash, data");
  if (existing.error) throw existing.error;
  const hashMap = new Map(
    (existing.data ?? []).map((r) => [r.id, r.password_hash as string]),
  );
  const roleMap = new Map(
    (existing.data ?? []).map((r) => [
      r.id as string,
      (r.data as { role?: string } | null)?.role,
    ]),
  );
  const avatarMap = new Map(
    (existing.data ?? []).map((r) => [
      r.id as string,
      (r.data as { avatar?: string } | null)?.avatar,
    ]),
  );
  const dataMap = new Map(
    (existing.data ?? []).map((r) => [
      r.id as string,
      r.data as Player | null,
    ]),
  );

  const rows = [];
  for (const p of players) {
    let password_hash = hashMap.get(p.id);
    if (p.password && !p.password.startsWith("$2")) {
      password_hash = await hashPassword(p.password);
    }
    // لا نخترع كلمة مرور جديدة — هذا كان يفسد تسجيل الدخول
    if (!password_hash) continue;

    const { password: _pw, ...rest } = p;
    const prevRaw = dataMap.get(p.id);
    const prevPlayer = prevRaw
      ? normalizePlayer({
          ...prevRaw,
          id: p.id,
          username: prevRaw.username || p.username,
        })
      : null;

    // عميل قديم يزامن بيانات أقدم → لا نسمح بمسح نقاط/انتصارات أحدث على السيرفر
    const incoming = normalizePlayer({ ...rest, id: p.id, username: p.username });
    const merged =
      prevPlayer && playerProgressScore(prevPlayer) > playerProgressScore(incoming)
        ? mergePlayersPreferProgress(prevPlayer, incoming)
        : prevPlayer
          ? mergePlayersPreferProgress(incoming, prevPlayer)
          : incoming;

    const preservedRole = mergeRole(roleMap.get(p.id), merged.role);
    const badges = Array.isArray(merged.badges)
      ? merged.badges.filter((b) => b !== "مشرف" && b !== "المالك")
      : [];
    if (preservedRole === "owner") badges.push("المالك");
    else if (preservedRole === "admin") badges.push("مشرف");

    // لا نستبدل أفتار محفوظ بصورة افتراضية من جهاز آخر أثناء المزامنة
    const existingAvatar = avatarMap.get(p.id);
    const avatar = isRealAvatar(merged.avatar)
      ? merged.avatar
      : isRealAvatar(existingAvatar)
        ? existingAvatar
        : merged.avatar || "/logo.png";

    const { password: _mergedPw, ...mergedRest } = merged;
    rows.push({
      id: p.id,
      username: merged.username,
      password_hash,
      data: {
        ...mergedRest,
        avatar,
        role: preservedRole,
        rank:
          preservedRole === "member"
            ? merged.rank
            : preservedRole === "owner"
              ? "المالك"
              : "مشرف",
        badges,
        password: "",
      },
      updated_at: new Date().toISOString(),
    });
  }

  if (!rows.length) return;

  // قراءة ثانية فورية قبل الكتابة — تمنع سباق مع منح نقاط المتأهلين
  const ids = rows.map((r) => r.id as string);
  const { data: freshRows, error: freshErr } = await db
    .from("profiles")
    .select("id, data")
    .in("id", ids);
  if (freshErr) throw freshErr;
  const freshMap = new Map(
    (freshRows ?? []).map((r) => [
      r.id as string,
      r.data
        ? normalizePlayer({
            ...(r.data as Player),
            id: r.id as string,
            username: (r.data as Player).username || "",
          })
        : null,
    ]),
  );

  const finalRows = rows.map((row) => {
    const incoming = normalizePlayer({
      ...(row.data as Player),
      id: row.id as string,
      username: (row.data as Player).username,
    });
    const fresh = freshMap.get(row.id as string);
    const merged = fresh
      ? mergePlayersPreferProgress(incoming, fresh)
      : incoming;
    const preservedRole = mergeRole(
      (fresh?.role ?? (row.data as Player).role) as UserRole | undefined,
      merged.role,
    );
    const badges = Array.isArray(merged.badges)
      ? merged.badges.filter((b) => b !== "مشرف" && b !== "المالك")
      : [];
    if (preservedRole === "owner") badges.push("المالك");
    else if (preservedRole === "admin") badges.push("مشرف");
    const { password: _pw, ...mergedRest } = merged;
    return {
      ...row,
      username: merged.username,
      data: {
        ...mergedRest,
        role: preservedRole,
        rank:
          preservedRole === "member"
            ? merged.rank
            : preservedRole === "owner"
              ? "المالك"
              : "مشرف",
        badges,
        password: "",
      },
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await db.from("profiles").upsert(finalRows);
  if (error) throw error;
}

async function replaceCollection<T extends { id: string }>(
  table: string,
  items: T[],
) {
  const db = getSupabaseAdmin();
  const { data: current, error: readError } = await db.from(table).select("id");
  if (readError) throw readError;
  const keep = new Set(items.map((i) => i.id));
  const toDelete = (current ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error } = await db.from(table).delete().in("id", toDelete);
    if (error) throw error;
  }
  if (!items.length) return;
  const rows = items.map((item) => {
    const { id, ...rest } = item as T & Record<string, unknown>;
    return {
      id,
      data: rest,
      updated_at: new Date().toISOString(),
    };
  });
  const { error } = await db.from(table).upsert(rows);
  if (error) throw error;
}

type RegistrationRequestLike = {
  id: string;
  username: string;
  userId?: string;
  teammateUsername?: string;
  teammateUserId?: string;
  teammate2Username?: string;
  teammate2UserId?: string;
  createdAt: string;
};

function mergePendingLists(
  a: RegistrationRequestLike[] = [],
  b: RegistrationRequestLike[] = [],
) {
  const map = new Map<string, RegistrationRequestLike>();
  const keyOf = (r: RegistrationRequestLike) => {
    if (r.id) return `id:${r.id}`;
    const names = [r.username, r.teammateUsername, r.teammate2Username]
      .filter(Boolean)
      .map((x) => x!.toLowerCase())
      .sort()
      .join("|");
    return `u:${names}`;
  };
  for (const r of [...a, ...b]) {
    const key = keyOf(r);
    if (!map.has(key)) map.set(key, r);
  }
  return [...map.values()].sort((x, y) =>
    (y.createdAt || "").localeCompare(x.createdAt || ""),
  );
}

export async function findTournamentByRef(ref: string) {
  const key = decodeURIComponent(ref || "").trim();
  if (!key) return null;
  const db = getSupabaseAdmin();

  const byId = await db
    .from("tournaments")
    .select("id, data")
    .eq("id", key)
    .maybeSingle();
  if (byId.error) throw byId.error;
  if (byId.data) {
    const t = { id: byId.data.id, ...(byId.data.data as object) } as Tournament;
    return t.deleted ? null : t;
  }

  const { data, error } = await db.from("tournaments").select("id, data");
  if (error) throw error;
  const lower = key.toLowerCase();
  const row = (data ?? []).find((r) => {
    const t = { id: r.id, ...(r.data as object) } as Tournament;
    if (t.deleted) return false;
    return t.id.toLowerCase() === lower || t.shareCode?.toLowerCase() === lower;
  });
  if (!row) return null;
  return { id: row.id, ...(row.data as object) } as Tournament;
}

export async function saveTournament(tournament: Tournament) {
  const db = getSupabaseAdmin();
  const { id, ...rest } = tournament;
  const { error } = await db.from("tournaments").upsert({
    id,
    data: rest,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return tournament;
}

export async function deleteTournament(id: string) {
  const existing = await findTournamentByRef(id);
  if (!existing) return { ok: true as const };
  // حذف ناعم حتى لا تعيد مزامنة جهاز آخر إنشاء الرابط
  await saveTournament({
    ...existing,
    deleted: true,
    registrationOpen: false,
    pendingRegistrations: [],
  });
  return { ok: true as const };
}

/** حفظ البطولات مع الإبقاء على أحدث تسجيلات السيرفر (قراءة جديدة قبل الكتابة) */
async function upsertTournaments(items: Tournament[]) {
  const db = getSupabaseAdmin();
  const { data: current, error: readError } = await db
    .from("tournaments")
    .select("id, data");
  if (readError) throw readError;

  const existingMap = new Map(
    (current ?? []).map((row) => [
      row.id as string,
      { id: row.id, ...(row.data as object) } as Tournament,
    ]),
  );

  // الحذف يتم عبر deleteTournament فقط — لا نحذف صفوفاً لأن قائمة عميل ناقصة
  if (!items.length) return;

  // قراءة ثانية مباشرة قبل الكتابة — حتى لا تُمسَح تسجيلات وصلت عبر API في نفس اللحظة
  const { data: latestRows, error: latestError } = await db
    .from("tournaments")
    .select("id, data");
  if (latestError) throw latestError;
  const latestMap = new Map(
    (latestRows ?? []).map((row) => [
      row.id as string,
      { id: row.id, ...(row.data as object) } as Tournament,
    ]),
  );

  const rows = items.map((item) => {
    const fresh = latestMap.get(item.id) || existingMap.get(item.id);
    // لا تُحيي رابطاً محذوفاً ناعماً بمزامنة جهاز قديم
    if (fresh?.deleted) {
      const { id, ...rest } = fresh;
      return {
        id,
        data: {
          ...rest,
          deleted: true,
          registrationOpen: false,
          pendingRegistrations: [],
        },
        updated_at: new Date().toISOString(),
      };
    }
    const { id, ...rest } = item;
    const itemStamp = item.bracketUpdatedAt
      ? Date.parse(item.bracketUpdatedAt)
      : 0;
    const freshStamp = fresh?.bracketUpdatedAt
      ? Date.parse(fresh.bracketUpdatedAt)
      : 0;
    // مزامنة جماعية: لا تستبدل شجرة أحدث على السيرفر بنسخة أقدم/بدون طابع
    let bracket = fresh?.bracket ?? item.bracket ?? [];
    let bracketUpdatedAt = fresh?.bracketUpdatedAt ?? item.bracketUpdatedAt;
    if (itemStamp > freshStamp && Array.isArray(item.bracket)) {
      bracket = item.bracket;
      bracketUpdatedAt = item.bracketUpdatedAt;
    } else if (itemStamp > 0 && itemStamp === freshStamp) {
      bracket = pickPreferredBracket(
        item.bracket,
        fresh?.bracket,
        item.bracketUpdatedAt,
        fresh?.bracketUpdatedAt,
      );
      bracketUpdatedAt = item.bracketUpdatedAt || fresh?.bracketUpdatedAt;
    }
    // لا تمسح فرق الديو بمزامنة عميل ناقصة
    const teams =
      Array.isArray(item.teams) && item.teams.length > 0
        ? item.teams
        : Array.isArray(fresh?.teams) && fresh.teams.length > 0
          ? fresh.teams
          : item.teams ?? fresh?.teams;
    const format = item.format || fresh?.format;
    const rewardedMatchPlayerKeys = [
      ...new Set([
        ...((Array.isArray(item.rewardedMatchPlayerKeys)
          ? item.rewardedMatchPlayerKeys
          : []) as string[]),
        ...((Array.isArray(fresh?.rewardedMatchPlayerKeys)
          ? fresh.rewardedMatchPlayerKeys
          : []) as string[]),
      ]),
    ];

    return {
      id,
      data: {
        ...rest,
        deleted: false,
        bracket,
        bracketUpdatedAt,
        teams,
        format,
        rewardedMatchPlayerKeys,
        pendingRegistrations: fresh?.pendingRegistrations ?? [],
        shareCode: item.shareCode || fresh?.shareCode,
      },
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await db.from("tournaments").upsert(rows);
  if (error) throw error;
}

export async function appendPendingRegistration(
  tournamentRef: string,
  request: RegistrationRequestLike,
) {
  const tournament = await findTournamentByRef(tournamentRef);
  if (!tournament || tournament.deleted) {
    return { ok: false as const, error: "رابط التسجيل غير موجود" };
  }

  const pending = mergePendingLists(
    tournament.pendingRegistrations as RegistrationRequestLike[] | undefined,
    [request],
  );
  const next: Tournament = {
    ...tournament,
    pendingRegistrations: pending,
    // لا نغلق التسجيل تلقائياً عند اكتمال العدد — الزيادة مسموحة
  };
  await saveTournament(next);
  return { ok: true as const, tournament: next };
}

export async function removePendingRegistration(
  tournamentRef: string,
  requestId: string,
) {
  const tournament = await findTournamentByRef(tournamentRef);
  if (!tournament) return { ok: false as const, error: "رابط التسجيل غير موجود" };
  const next: Tournament = {
    ...tournament,
    pendingRegistrations: (tournament.pendingRegistrations ?? []).filter(
      (r) => r.id !== requestId,
    ),
  };
  await saveTournament(next);
  return { ok: true as const, tournament: next };
}

/** تحديث أسماء تيم/لاعب مسجّل قبل إنشاء القرعة */
export async function updatePendingRegistration(
  tournamentRef: string,
  requestId: string,
  patch: Omit<RegistrationRequestLike, "id" | "createdAt">,
) {
  const tournament = await findTournamentByRef(tournamentRef);
  if (!tournament || tournament.deleted) {
    return { ok: false as const, error: "رابط التسجيل غير موجود" };
  }
  const pending = [
    ...((tournament.pendingRegistrations as
      | RegistrationRequestLike[]
      | undefined) ?? []),
  ];
  const idx = pending.findIndex((r) => r.id === requestId);
  if (idx < 0) {
    return { ok: false as const, error: "التسجيل غير موجود" };
  }
  pending[idx] = {
    ...pending[idx],
    ...patch,
    id: requestId,
    createdAt: pending[idx].createdAt,
  };
  const next: Tournament = {
    ...tournament,
    pendingRegistrations: pending,
  };
  await saveTournament(next);
  return { ok: true as const, tournament: next };
}

export async function replacePendingRegistrations(
  tournamentRef: string,
  pendingRegistrations: RegistrationRequestLike[],
  patch?: Partial<Pick<Tournament, "registrationOpen" | "status">>,
) {
  const tournament = await findTournamentByRef(tournamentRef);
  if (!tournament) return { ok: false as const, error: "رابط التسجيل غير موجود" };
  const next: Tournament = {
    ...tournament,
    ...patch,
    pendingRegistrations,
  };
  await saveTournament(next);
  return { ok: true as const, tournament: next };
}

export async function saveStoreSnapshot(snapshot: {
  players?: Player[];
  tournaments?: Tournament[];
  votes?: Vote[];
  news?: NewsItem[];
  notifications?: NotificationItem[];
  hallOfFame?: HallOfFameEntry[];
}) {
  await Promise.all([
    snapshot.players ? upsertPlayers(snapshot.players) : Promise.resolve(),
    snapshot.tournaments
      ? upsertTournaments(snapshot.tournaments)
      : Promise.resolve(),
    snapshot.votes
      ? replaceCollection("votes", snapshot.votes)
      : Promise.resolve(),
    snapshot.news ? replaceCollection("news", snapshot.news) : Promise.resolve(),
    snapshot.notifications
      ? replaceCollection("notifications", snapshot.notifications)
      : Promise.resolve(),
    snapshot.hallOfFame
      ? replaceCollection("hall_of_fame", snapshot.hallOfFame)
      : Promise.resolve(),
  ]);
}
