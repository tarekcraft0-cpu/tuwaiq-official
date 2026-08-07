const membersList = document.getElementById("members-list");
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
    const fullCircle = ["nelo-8zf", "dana-aub", "munira-4d9"].includes(member.id)
      ? " avatar-img--full"
      : "";
    return `<img class="avatar-img${fullCircle}" src="${escapeHtml(member.avatar)}?v=9" alt="${escapeHtml(member.displayName)}" width="120" height="120" />`;
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
  const slot = membersList.querySelector(`[data-opinions-for="${memberId}"]`);
  const article = membersList.querySelector(`.member-card[data-id="${memberId}"]`);
  const heading = article?.querySelector(".opinion-head h4");
  const list = Array.isArray(opinions) ? opinions : [];

  if (slot) slot.innerHTML = renderOpinions(list);
  if (heading) heading.textContent = `آراء الجميع (${list.length}) — ظاهرة للكل`;

  const cached = membersCache.find((m) => m.id === memberId);
  if (cached) {
    cached.opinions = list;
    cached.opinionCount = list.length;
  }
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
    bioSheetAvatar.src = `${member.avatar}?v=9`;
    bioSheetAvatar.classList.toggle(
      "avatar-img--full",
      ["nelo-8zf", "dana-aub", "munira-4d9"].includes(member.id)
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

function renderMembers(members) {
  membersCache = members;

  if (!members.length) {
    membersList.innerHTML = "";
    emptyState.hidden = false;
    memberCount.hidden = true;
    return;
  }

  emptyState.hidden = true;
  memberCount.hidden = false;
  memberCount.textContent = `${members.length} عضو في السجل`;

  membersList.innerHTML = members
    .map(
      (m, index) => `
      <article class="member-card" style="animation-delay: ${Math.min(index * 0.06, 0.4)}s" data-id="${escapeHtml(m.id)}">
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
    `
    )
    .join("");

  membersList.querySelectorAll(".open-bio").forEach((btn) => {
    btn.addEventListener("click", () => openBioSheet(btn.dataset.id));
  });

  membersList.querySelectorAll(".write-opinion").forEach((btn) => {
    btn.addEventListener("click", () => openOpinionDialog(btn.dataset.id));
  });
}

async function loadOpinions(memberId) {
  try {
    const member = await fetchJson(`/api/members/${memberId}`);
    updateOpinionPanel(memberId, member.opinions || []);
  } catch {
    const slot = membersList.querySelector(`[data-opinions-for="${memberId}"]`);
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

async function init() {
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
    const members = await fetchJson("/api/members");
    members.forEach((m) => {
      updateOpinionPanel(m.id, m.opinions || []);
    });
  } catch {
    // تجاهل فشل التحديث التلقائي
  }
}, 8000);
