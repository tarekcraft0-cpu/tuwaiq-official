const membersGrid = document.getElementById("members-grid");
const membersOpinions = document.getElementById("members-opinions");
const emptyState = document.getElementById("empty-state");
const memberCount = document.getElementById("member-count");
const dialog = document.getElementById("opinion-dialog");
const form = document.getElementById("opinion-form");
const dialogMember = document.getElementById("dialog-member");
const formError = document.getElementById("form-error");
const cancelBtn = document.getElementById("cancel-opinion");
const bioSheet = document.getElementById("bio-sheet");
const bioSheetAvatar = document.getElementById("bio-sheet-avatar");
const bioSheetName = document.getElementById("bio-sheet-name");
const bioSheetUser = document.getElementById("bio-sheet-user");
const bioSheetTitle = document.getElementById("bio-sheet-title");
const bioSheetRole = document.getElementById("bio-sheet-role");
const bioSheetBody = document.getElementById("bio-sheet-body");
const closeBioBtn = document.getElementById("close-bio");
const bioBackdrop = document.getElementById("bio-backdrop");

let activeMemberId = null;
let membersCache = [];

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBio(bio) {
  return escapeHtml(bio)
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function renderAvatar(member) {
  if (member.avatar) {
    const fullCircle = ["nelo-8zf", "dana-aub", "munira-4d9", "slom-slom"].includes(
      member.id
    )
      ? " avatar-img--full"
      : "";
    return `<img class="avatar-img${fullCircle}" src="${escapeHtml(member.avatar)}?v=10" alt="${escapeHtml(member.displayName)}" width="120" height="120" />`;
  }
  return `<span class="avatar-fallback">${escapeHtml(member.avatarInitial)}</span>`;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "حدث خطأ غير متوقع");
  }
  return data;
}

function renderOpinions(opinions) {
  if (!opinions.length) {
    return `<p class="no-opinions">ما فيه آراء بعد. أي شخص يقدر يكتب، والكل بيشوفه هنا.</p>`;
  }

  return `
    <div class="opinions">
      ${opinions
        .map((op) => {
          const isTrue = op.verdict === "true";
          return `
            <article class="opinion">
              <div class="opinion-top">
                <span class="opinion-author">${escapeHtml(op.author || "زائر")}</span>
                <span class="badge ${isTrue ? "badge-true" : "badge-false"}">
                  ${isTrue ? "حقيقي" : "غير حقيقي"}
                </span>
              </div>
              <p class="opinion-text">${escapeHtml(op.text)}</p>
              <p class="opinion-date">${escapeHtml(formatDate(op.createdAt))}</p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function updateOpinionPanel(memberId, opinions) {
  const slot = membersOpinions.querySelector(`[data-opinions-for="${memberId}"]`);
  const article = membersOpinions.querySelector(`.member-card[data-id="${memberId}"]`);
  const heading = article?.querySelector(".opinion-head h4");
  const tileCount = membersGrid.querySelector(
    `.member-tile[data-id="${memberId}"] .member-tile-count`
  );
  const list = Array.isArray(opinions) ? opinions : [];

  if (slot) slot.innerHTML = renderOpinions(list);
  if (heading) heading.textContent = `آراء الجميع (${list.length}) — ظاهرة للكل`;
  if (tileCount) {
    tileCount.textContent =
      list.length > 0 ? `${list.length} رأي` : "لا آراء بعد";
  }

  const cached = membersCache.find((m) => m.id === memberId);
  if (cached) {
    cached.opinions = list;
    cached.opinionCount = list.length;
  }
}

function goToMemberOpinions(memberId) {
  const target = document.getElementById(`opinions-${memberId}`);
  if (!target) return;

  membersOpinions
    .querySelectorAll(".member-card.is-focused")
    .forEach((el) => el.classList.remove("is-focused"));
  membersGrid
    .querySelectorAll(".member-tile.is-active")
    .forEach((el) => el.classList.remove("is-active"));

  target.classList.add("is-focused");
  const tile = membersGrid.querySelector(`.member-tile[data-id="${memberId}"]`);
  if (tile) tile.classList.add("is-active");

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openBioSheet(memberId) {
  const member = membersCache.find((m) => m.id === memberId);
  if (!member || !member.bio) return;

  bioSheetName.textContent = member.displayName;
  bioSheetUser.textContent = `${member.flag ? member.flag + " " : ""}@${member.username}`;
  bioSheetTitle.textContent = member.title || "";
  bioSheetRole.textContent = member.role || "عضو";
  bioSheetBody.innerHTML = formatBio(member.bio);

  if (member.avatar) {
    bioSheetAvatar.hidden = false;
    bioSheetAvatar.src = `${member.avatar}?v=10`;
    bioSheetAvatar.classList.toggle(
      "avatar-img--full",
      ["nelo-8zf", "dana-aub", "munira-4d9", "slom-slom"].includes(member.id)
    );
    bioSheetAvatar.alt = member.displayName;
  } else {
    bioSheetAvatar.hidden = true;
    bioSheetAvatar.removeAttribute("src");
  }

  bioBackdrop.hidden = false;
  bioSheet.hidden = false;
  requestAnimationFrame(() => {
    bioBackdrop.classList.add("is-open");
    bioSheet.classList.add("is-open");
  });
  document.body.classList.add("sheet-open");
}

function closeBioSheet() {
  bioBackdrop.classList.remove("is-open");
  bioSheet.classList.remove("is-open");
  document.body.classList.remove("sheet-open");
  window.setTimeout(() => {
    if (!bioSheet.classList.contains("is-open")) {
      bioBackdrop.hidden = true;
      bioSheet.hidden = true;
    }
  }, 320);
}

function chunkMembers(members, size = 3) {
  const rows = [];
  for (let i = 0; i < members.length; i += size) {
    rows.push(members.slice(i, i + size));
  }
  return rows;
}

function renderMemberTile(m, index) {
  const count = m.opinionCount || 0;
  return `
    <button
      type="button"
      class="member-tile"
      data-id="${escapeHtml(m.id)}"
      style="animation-delay: ${Math.min(index * 0.05, 0.35)}s"
    >
      <div class="avatar-ring member-tile-avatar">
        <div class="avatar">${renderAvatar(m)}</div>
      </div>
      <h3>${escapeHtml(m.displayName)}</h3>
      <p class="username">${m.flag ? `<span class="flag">${escapeHtml(m.flag)}</span> ` : ""}@${escapeHtml(m.username)}</p>
      ${m.role ? `<span class="member-tile-role">${escapeHtml(m.role)}</span>` : ""}
      <span class="member-tile-count">${count > 0 ? `${count} رأي` : "لا آراء بعد"}</span>
      <span class="member-tile-hint">اضغط لعرض الآراء</span>
    </button>
  `;
}

function renderOpinionCard(m, index) {
  return `
    <article
      class="member-card"
      id="opinions-${escapeHtml(m.id)}"
      style="animation-delay: ${Math.min(index * 0.04, 0.3)}s"
      data-id="${escapeHtml(m.id)}"
    >
      <div class="member-profile">
        <div class="avatar-ring">
          <div class="avatar">${renderAvatar(m)}</div>
        </div>
        <div class="member-meta">
          <h3>${escapeHtml(m.displayName)}</h3>
          <p class="username">${m.flag ? `<span class="flag">${escapeHtml(m.flag)}</span> ` : ""}@${escapeHtml(m.username)}</p>
          ${
            m.bio
              ? `<button type="button" class="bio-trigger open-bio" data-id="${escapeHtml(m.id)}">
                  <span class="bio-trigger-label">${escapeHtml(m.role || "عرض السيرة")}</span>
                  <span class="bio-trigger-hint">اضغط لعرض السيرة</span>
                  <span class="bio-trigger-arrow" aria-hidden="true">↗</span>
                </button>`
              : m.role
                ? `<span class="bio-trigger bio-trigger-static"><span class="bio-trigger-label">${escapeHtml(m.role)}</span></span>`
                : ""
          }
        </div>
      </div>
      <div class="opinion-panel">
        <div class="opinion-head">
          <div>
            <h4>آراء الجميع (${m.opinionCount || 0}) — ظاهرة للكل</h4>
            <p class="opinion-public-note">أي زائر يكتب، والكل يشوف اللي انكتب</p>
          </div>
          <button type="button" class="btn btn-outline write-opinion" data-id="${escapeHtml(m.id)}">
            اكتب رأيك
          </button>
        </div>
        <div class="opinions-slot" data-opinions-for="${escapeHtml(m.id)}">
          ${renderOpinions(m.opinions || [])}
        </div>
      </div>
    </article>
  `;
}

function renderMembers(members) {
  membersCache = members;

  if (!members.length) {
    membersGrid.innerHTML = "";
    membersOpinions.innerHTML = "";
    emptyState.hidden = false;
    memberCount.hidden = true;
    return;
  }

  emptyState.hidden = true;
  memberCount.hidden = false;
  memberCount.textContent = `${members.length} عضو في السجل`;

  const rows = chunkMembers(members, 3);
  membersGrid.innerHTML = rows
    .map(
      (row, rowIndex) => `
      <div class="members-row">
        ${row.map((m, i) => renderMemberTile(m, rowIndex * 3 + i)).join("")}
      </div>
    `
    )
    .join("");

  membersOpinions.innerHTML = `
    <div class="opinions-section-head">
      <h3>آراء الأعضاء</h3>
      <p>اختر عضو من القائمة فوق، أو مرّ هنا مباشرة</p>
    </div>
    ${members.map((m, index) => renderOpinionCard(m, index)).join("")}
  `;

  membersGrid.querySelectorAll(".member-tile").forEach((tile) => {
    tile.addEventListener("click", () => goToMemberOpinions(tile.dataset.id));
  });

  membersOpinions.querySelectorAll(".open-bio").forEach((btn) => {
    btn.addEventListener("click", () => openBioSheet(btn.dataset.id));
  });

  membersOpinions.querySelectorAll(".write-opinion").forEach((btn) => {
    btn.addEventListener("click", () => openOpinionDialog(btn.dataset.id));
  });
}

async function loadOpinions(memberId) {
  try {
    const member = await fetchJson(`/api/members/${memberId}`);
    updateOpinionPanel(memberId, member.opinions || []);
  } catch {
    const slot = membersOpinions.querySelector(`[data-opinions-for="${memberId}"]`);
    if (slot) slot.innerHTML = `<p class="no-opinions">تعذر تحميل الآراء.</p>`;
  }
}

function openOpinionDialog(memberId) {
  const member = membersCache.find((m) => m.id === memberId);
  if (!member) return;

  activeMemberId = memberId;
  dialogMember.textContent = `عن: ${member.displayName} (@${member.username})`;
  form.reset();
  formError.hidden = true;
  formError.textContent = "";

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
}

closeBioBtn.addEventListener("click", closeBioSheet);
bioBackdrop.addEventListener("click", closeBioSheet);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && bioSheet.classList.contains("is-open")) {
    closeBioSheet();
  }
});

cancelBtn.addEventListener("click", () => {
  dialog.close();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeMemberId) return;

  const submitBtn = document.getElementById("submit-opinion");
  formError.hidden = true;
  const data = new FormData(form);
  const payload = {
    author: String(data.get("author") || "").trim() || "زائر",
    text: String(data.get("text") || "").trim(),
    verdict: String(data.get("verdict") || ""),
  };

  if (submitBtn) submitBtn.disabled = true;

  try {
    const created = await fetchJson(`/api/members/${activeMemberId}/opinions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // أظهر الرأي فورًا للجميع على الصفحة الحالية
    const cached = membersCache.find((m) => m.id === activeMemberId);
    const next = [created, ...((cached && cached.opinions) || [])];
    updateOpinionPanel(activeMemberId, next);

    dialog.close();
    // ثم حدّث من السيرفر للتأكيد أن الحفظ الدائم تم
    await loadOpinions(activeMemberId);
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

function formatVisitCount(count) {
  try {
    return new Intl.NumberFormat("ar-SA").format(Number(count) || 0);
  } catch {
    return String(Number(count) || 0);
  }
}

function showVisitCount(count) {
  const numEl = document.getElementById("visit-count-num");
  if (!numEl) return;
  const next = Number(count) || 0;
  const prev = Number(String(numEl.dataset.value || numEl.textContent).replace(/[^\d]/g, "")) || 0;
  numEl.dataset.value = String(next);
  if (prev === next) {
    numEl.textContent = formatVisitCount(next);
    return;
  }
  const start = prev;
  const diff = next - start;
  const steps = Math.min(24, Math.abs(diff));
  if (steps <= 1) {
    numEl.textContent = formatVisitCount(next);
    return;
  }
  let i = 0;
  const tick = () => {
    i += 1;
    const value = Math.round(start + (diff * i) / steps);
    numEl.textContent = formatVisitCount(value);
    if (i < steps) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function trackVisit() {
  const key = "tuwaiq_visit_session";
  try {
    // كل شخص يدخل (جلسة جديدة) يزيد العداد مرة
    if (sessionStorage.getItem(key)) {
      const data = await fetchJson("/api/visits");
      showVisitCount(data.count);
      return;
    }
    const data = await fetchJson("/api/visits", { method: "POST" });
    sessionStorage.setItem(key, "1");
    showVisitCount(data.count);
  } catch {
    const numEl = document.getElementById("visit-count-num");
    if (numEl) numEl.textContent = "—";
  }
}

const heroFloatOpinions = document.getElementById("hero-float-opinions");
const groupOpinionsList = document.getElementById("group-opinions-list");
const groupOpinionForm = document.getElementById("group-opinion-form");
const groupFormError = document.getElementById("group-form-error");
let groupOpinionsCache = [];

const FLOAT_PATHS = [
  { x1: "-9rem", y1: "-5.5rem", x2: "-10rem", y2: "1rem", x3: "-8rem", y3: "6rem" },
  { x1: "8.5rem", y1: "-6rem", x2: "10rem", y2: "-1rem", x3: "9rem", y3: "5rem" },
  { x1: "-7rem", y1: "7rem", x2: "-3rem", y2: "8.5rem", x3: "2rem", y3: "7.5rem" },
  { x1: "7rem", y1: "6.5rem", x2: "3rem", y2: "8rem", x3: "-2rem", y3: "7rem" },
  { x1: "-10rem", y1: "0", x2: "-9rem", y2: "-4rem", x3: "-7.5rem", y3: "3rem" },
  { x1: "9.5rem", y1: "0.5rem", x2: "8rem", y2: "4.5rem", x3: "7rem", y3: "-3rem" },
  { x1: "-2rem", y1: "-8rem", x2: "3rem", y2: "-7.5rem", x3: "6rem", y3: "-6rem" },
  { x1: "1rem", y1: "8.5rem", x2: "-4rem", y2: "7.5rem", x3: "-7rem", y3: "5.5rem" },
];

function shortenOpinion(text, max = 34) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function renderGroupOpinionsList(opinions) {
  if (!groupOpinionsList) return;
  if (!opinions.length) {
    groupOpinionsList.innerHTML =
      `<p class="group-opinions-empty">ما فيه آراء عن القروب بعد. كن أول من يكتب.</p>`;
    return;
  }

  groupOpinionsList.innerHTML = opinions
    .map(
      (op) => `
      <article class="group-opinion-item">
        <div class="group-opinion-top">
          <span class="group-opinion-author">${escapeHtml(op.author || "زائر")}</span>
          <time class="opinion-date" datetime="${escapeHtml(op.createdAt)}">${escapeHtml(
            formatDate(op.createdAt)
          )}</time>
        </div>
        <p class="group-opinion-text">${escapeHtml(op.text)}</p>
      </article>
    `
    )
    .join("");
}

function renderHeroFloatOpinions(opinions) {
  if (!heroFloatOpinions) return;
  const latest = opinions.slice(0, 8);
  if (!latest.length) {
    heroFloatOpinions.innerHTML = "";
    return;
  }

  heroFloatOpinions.innerHTML = latest
    .map((op, index) => {
      const path = FLOAT_PATHS[index % FLOAT_PATHS.length];
      const dur = `${12 + (index % 5) * 1.4}s`;
      const delay = `${(index * 0.35).toFixed(2)}s`;
      return `
        <div
          class="float-chip"
          style="
            --x1:${path.x1};--y1:${path.y1};
            --x2:${path.x2};--y2:${path.y2};
            --x3:${path.x3};--y3:${path.y3};
            --dur:${dur};--delay:${delay};
          "
        >
          <span>${escapeHtml(shortenOpinion(op.text))}</span>
        </div>
      `;
    })
    .join("");
}

function renderGroupOpinions(opinions) {
  groupOpinionsCache = Array.isArray(opinions) ? opinions : [];
  renderHeroFloatOpinions(groupOpinionsCache);
  renderGroupOpinionsList(groupOpinionsCache);
}

async function loadGroupOpinions() {
  const opinions = await fetchJson("/api/group-opinions");
  renderGroupOpinions(opinions);
}

if (groupOpinionForm) {
  groupOpinionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById("submit-group-opinion");
    if (groupFormError) {
      groupFormError.hidden = true;
      groupFormError.textContent = "";
    }

    const data = new FormData(groupOpinionForm);
    const payload = {
      author: String(data.get("author") || "").trim() || "زائر",
      text: String(data.get("text") || "").trim(),
    };

    if (submitBtn) submitBtn.disabled = true;
    try {
      const created = await fetchJson("/api/group-opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      renderGroupOpinions([created, ...groupOpinionsCache]);
      groupOpinionForm.reset();
    } catch (err) {
      if (groupFormError) {
        groupFormError.textContent = err.message;
        groupFormError.hidden = false;
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

async function init() {
  trackVisit();
  loadGroupOpinions().catch(() => {
    if (groupOpinionsList) {
      groupOpinionsList.innerHTML =
        `<p class="group-opinions-empty">تعذر تحميل آراء القروب حالياً.</p>`;
    }
  });
  try {
    const members = await fetchJson("/api/members");
    renderMembers(members);
  } catch {
    emptyState.hidden = false;
    emptyState.querySelector(".empty-title").textContent = "تعذر الاتصال بالسيرفر";
    emptyState.querySelector(".empty-text").textContent =
      "تأكد أن سيرفر طويق يعمل ثم حدّث الصفحة.";
  }
}

init();

// حدّث الآراء كل فترة عشان اللي ينكتب يظهر للجميع بدون إعادة تحميل يدوي
setInterval(async () => {
  if (document.body.classList.contains("sheet-open") || dialog.open) {
    return;
  }
  try {
    const [members, groupOpinions] = await Promise.all([
      fetchJson("/api/members"),
      fetchJson("/api/group-opinions"),
    ]);
    members.forEach((m) => {
      updateOpinionPanel(m.id, m.opinions || []);
    });
    renderGroupOpinions(groupOpinions);
  } catch {
    // تجاهل فشل التحديث التلقائي
  }
}, 8000);
