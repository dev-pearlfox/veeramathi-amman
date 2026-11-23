const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

// Auth gate — bounce to index.html if no valid Supabase session. Same
// client + shared localStorage session key means whichever page logged
// in, the other one recognizes it. Done as an async IIFE so the redirect
// (if needed) happens before the rest of this script tries to query
// tables that would just return [] under RLS anyway.
(async () => {
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
  }
})();

// If someone signs out from another tab (or the JWT is revoked), bounce
// back to the login screen instead of quietly failing every request.
client.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.href = "index.html";
  }
});

// Logout button in the header (right end). signOutAndReload (shared.js)
// reloads after signOut so no stale in-memory state (open cells,
// debounced timers) survives past a logout — the signOut also fires the
// SIGNED_OUT event above, which redirects to index.html on the reloaded
// page.
$("logout-btn").addEventListener("click", () => {
  if (!window.confirm("Sign out?")) return;
  signOutAndReload(client);
});

let allPeople = [];

// The two lists of the page (people.member_group; memberGroupOf is in shared.js). தலைக்கட்டு is shown first, always.
// Others have their own S.No. and no Roll No.; a member is added to whichever list is showing.
const GROUP_LABELS = { thalaikattu: "தலைக்கட்டு", others: "Donors" };   // the data value stays "others"; only the words people see changed
const GROUP_PRINT_HEADINGS = { thalaikattu: "மொத்த குடும்பத் தலைவர்கள்", others: "Donors" };   // members-print.js
let activeGroup = "thalaikattu";
const peopleOfGroup = (group) => allPeople.filter((p) => memberGroupOf(p) === group);

// The தலைக்கட்டு list is split into family tables (people.family_group: 1, 2, 3 ...), each with its own S.No. from 1, like the
// printed booklet. The add row sends a new member to the table picked in #new-m-table (newMemberFamily); it starts on the last one.
let newMemberFamily = null;
const familyNumbers = () => [...new Set(peopleOfGroup("thalaikattu").map((p) => p.family_group).filter((n) => n != null))].sort((a, b) => a - b);
const lastFamily = () => familyNumbers().at(-1) ?? null;

// Rebuilds the "Add to table" choices: every table with its size and first member, then a "new table" at the end. Only
// தலைக்கட்டு has tables, so the row is hidden on Others.
function renderTablePicker() {
  const row = $("new-member-table-row");
  row.hidden = activeGroup !== "thalaikattu";
  if (row.hidden) return;
  const families = familyNumbers();
  const fresh = (families.at(-1) ?? 0) + 1;
  if (newMemberFamily == null || (newMemberFamily !== fresh && !families.includes(newMemberFamily))) newMemberFamily = lastFamily() ?? fresh;
  const options = families.map((n) => {
    const members = peopleOfGroup("thalaikattu").filter((p) => p.family_group === n);
    return `<option value="${n}">Table ${n} - ${members.length} member${members.length === 1 ? "" : "s"}, from ${escapeHtml(members[0].name.replace(/^திரு\.\s*/, "").slice(0, 28))}</option>`;
  });
  options.push(`<option value="${fresh}">New table ${fresh}</option>`);
  $("new-m-table").innerHTML = options.join("");
  $("new-m-table").value = String(newMemberFamily);
}

// The two buttons: the label and how many members the list holds (all of them, whatever the column filters say).
function renderGroupPills() {
  // Others have no Roll No., birth date or Avoid: body.group-others hides those columns and makes the table narrower (style.css, HEART_LOGIC #7).
  document.body.classList.toggle("group-others", activeGroup === "others");
  document.querySelectorAll("#group-pills .pill").forEach((pill) => {
    const group = pill.dataset.group;
    pill.classList.toggle("active", group === activeGroup);
    pill.setAttribute("aria-pressed", String(group === activeGroup));
    pill.innerHTML = `${GROUP_LABELS[group]} <span class="pill-count">${peopleOfGroup(group).length}</span>`;
  });
}

// escapeHtml, formatMobile live in shared.js (loaded before this file) —
// kept as one copy with app.js.

// #members-thead-wrap itself doesn't scroll horizontally (overflow-x:hidden
// — see style.css comment for why) so a horizontal drag on the body table
// mirrors onto it here, keeping columns aligned on narrow screens.
$("members-tbody-wrap").addEventListener("scroll", () => {
  $("members-thead-wrap").scrollLeft = $("members-tbody-wrap").scrollLeft;
});

// HEART LOGIC — do not change without asking (measures card.offsetHeight
// directly, not the parent's auto height).
// The header, pills bar, and table header row all live in one shared
// .sticky-top-stack now (see style.css), so only the pills bar itself needs
// a JS-computed value: its scroll-compact state uses transform:scale()
// rather than animating each pill's own padding/font-size (see the
// body.is-compact .members-filter-card comment in style.css for why), and
// scaling alone doesn't shrink the space the card reserves in the page
// (transform is purely visual, not layout) — a negative margin pulls that
// freed space closed, computed from the card's actual rendered height
// (offsetHeight, which transform doesn't affect) rather than guessed, since
// it varies by screen width and by how many pills wrap onto their own line.
// SCALE here must match the `scale(0.72)` in body.is-compact .members-filter-card.
const PILLS_CARD_COMPACT_SCALE = 0.72;
function syncPillsCardCollapse() {
  const card = document.querySelector(".members-filter-card");
  if (!card) return;
  const collapse = -(card.offsetHeight * (1 - PILLS_CARD_COMPACT_SCALE));
  document.documentElement.style.setProperty("--pills-card-margin-collapse", collapse + "px");
}
window.addEventListener("resize", syncPillsCardCollapse);
window.addEventListener("load", syncPillsCardCollapse);
if (document.fonts) document.fonts.ready.then(syncPillsCardCollapse);
syncPillsCardCollapse();
// syncHeaderTitleCollapse (HEART LOGIC — transform, not font-size, for the
// title's shrink) now lives in shared.js, since index.html needs the exact
// same behavior — one copy so the two pages can't drift apart.

function setStatus(message, isError) {
  const el = $("members-status");
  el.textContent = message || "";
  el.className = "status " + (isError ? "error" : "ok");
}

// Cell lock state is entirely dictated by the master lock (see setMasterLocked)
// — no per-cell 🔒 button anymore, since one global toggle in the totals-banner
// is the single source of truth. Rendered rows just have to match whatever the
// current master state is at render time; setCellsLocked syncs later toggles.
// Column names for the cells' accessible labels (same words as the table header in members.html).
const MEMBER_LABELS = { name: "பெயர்", name_en: "English Name", place: "Home Address", postal: "Postal Address", mobile: "Mobile Number", dob: "பிறந்த தேதி", avoid: "Avoid" };

function cell(p, field, value, extraAttrs, inputType = "text", before = "") {
  const locked = document.body.classList.contains("master-locked");
  const readonlyAttr = locked ? "readonly" : "";
  const unlockedClass = locked ? "" : " unlocked";
  return `<td>
    <div class="cell-flex">
      ${before}<input type="${inputType}" class="cell-input${unlockedClass}" data-field="${field}" ${ariaLabelAttr(MEMBER_LABELS[field], displayName(p))} value="${escapeHtml(value)}" ${readonlyAttr} ${extraAttrs || ""} />
    </div>
  </td>`;
}

// The home icon at the front of the Home Address and Postal Address cells (an SVG so it is crisp and takes the CSS colour);
// its popup lives in member-address.js. Grey outline = no address yet, orange and filled = address saved. `field` is the
// people column the icon edits: "address" (Home Address) or "postal_address".
const HOME_ICON_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/></svg>';
const addressButton = (p, field) => {
  const label = field === "address" ? MEMBER_LABELS.place : MEMBER_LABELS.postal;
  return `<button type="button" class="addr-btn ${isAddressComplete(p[field]) ? "address-complete" : ""}" data-addr="${field}" title="${label}" aria-label="${label} of ${escapeHtml(displayName(p))}">${HOME_ICON_SVG}</button>`;
};

// Postal Address cell: the home icon plus the town and city of the saved postal address. The town is shown, never typed here (it is
// not a .cell-input, so the lock and autosave code ignore it): the whole address is edited in the icon's popup.
const postalCell = (p) => `<td>
    <div class="cell-flex">
      ${addressButton(p, "postal_address")}<input type="text" class="postal-town" tabindex="-1" readonly ${ariaLabelAttr(MEMBER_LABELS.postal, displayName(p))} value="${escapeHtml(addrPlaceText(p.postal_address))}" />
    </div>
  </td>`;

// HEART LOGIC — "Avoid" means the person is no longer active (e.g.
// deceased). Default unchecked. Checking it fades this row and hides them
// from the current + every future function's Ledger Sheet, except a function
// where they already have an existing entry (see peopleForCurrentFunction()
// in app.js — do not change that exclusion rule without asking).
function avoidCell(p) {
  return `<td><input type="checkbox" class="avoid-check" ${ariaLabelAttr(MEMBER_LABELS.avoid, displayName(p))} ${p.avoid ? "checked" : ""} /></td>`;
}

// HEART LOGIC — roll_number is each person's permanent town-registry ID
// (see nextRollNumber() in app.js). It belongs only on this members page,
// never on a function's Ledger Sheet — do not change that without asking.
function renderRows() {
  const snoQ = $("filter-sno").value.trim().toLowerCase();
  const rollQ = $("filter-roll").value.trim().toLowerCase();
  const nameQ = $("filter-name").value.trim().toLowerCase();
  const nameEnQ = $("filter-name-en").value.trim().toLowerCase();
  const placeQ = $("filter-place").value.trim().toLowerCase();
  const postalQ = $("filter-postal").value.trim().toLowerCase();
  const dobQ = $("filter-dob").value.trim().replace(/[/.]/g, "-");   // 12/05 and 12.05 both mean 12-05
  const mobileQ = $("filter-mobile").value.trim().replace(/\s+/g, "").toLowerCase();

  renderGroupPills();
  const visible = peopleOfGroup(activeGroup).filter((p) => {
    if (snoQ && !String(p.member_no ?? "").toLowerCase().includes(snoQ)) return false;
    if (rollQ && !String(rollText(p)).toLowerCase().includes(rollQ)) return false;
    if (nameQ && !(p.name || "").toLowerCase().includes(nameQ)) return false;
    if (nameEnQ && !(p.name_en || "").toLowerCase().includes(nameEnQ)) return false;
    if (placeQ && !(p.place || "").toLowerCase().includes(placeQ)) return false;
    if (postalQ && !Object.values(p.postal_address ?? {}).join(" ").toLowerCase().includes(postalQ)) return false;   // any part: town, district, pincode...
    if (dobQ && !(p.dob || "").split("-").reverse().join("-").includes(dobQ)) return false;   // matches the dd-mm-yyyy shown
    if (mobileQ && !formatMobile(p.mobile).replace(/\s+/g, "").toLowerCase().includes(mobileQ)) return false;
    return true;
  });

  // An orange bar ("Table 2 - 17 members") sits above every family table. The first table showing gets it as the table's CAPTION
  // (#members-caption): a full-width first row would take over the column widths (HEART_LOGIC #7). Each later table gets a strip
  // row (class family-strip) above its first row. Both are judged on the rows that are showing, so a filter that hides a whole
  // table leaves no stray bar, and the count is of the members showing in that table. A strip has no data-person, so nothing that
  // works on member rows touches it.
  const showing = {};
  visible.forEach((p) => { showing[p.family_group] = (showing[p.family_group] || 0) + 1; });
  const bannerText = (n) => `Table ${n} - ${showing[n]} member${showing[n] === 1 ? "" : "s"}`;
  const strip = (p, i) => {
    if (i === 0 || p.family_group === visible[i - 1].family_group || p.family_group == null) return "";
    return `<tr class="family-strip" data-family="${p.family_group}"><td colspan="9">${bannerText(p.family_group)}</td></tr>`;
  };
  const firstFamily = visible[0]?.family_group ?? null;   // Others have no table: no bar
  $("members-caption").dataset.family = firstFamily ?? "";
  $("members-caption").textContent = firstFamily == null ? "" : bannerText(firstFamily);
  $("members-body").innerHTML = visible
    .map(
      (p, i) => `${strip(p, i)}<tr data-person="${p.id}" data-family="${p.family_group ?? ""}" class="${p.avoid ? "row-avoided" : ""}">
        <td>${p.member_no ?? ""}</td>
        <td>${rollText(p)}</td>
        ${cell(p, "name", p.name ?? "")}
        ${cell(p, "name_en", p.name_en ?? "")}
        ${cell(p, "place", p.place ?? "", "", "text", addressButton(p, "address"))}
        ${postalCell(p)}
        ${cell(p, "mobile", formatMobile(p.mobile), 'inputmode="numeric"')}
        ${cell(p, "dob", p.dob ?? "", 'min="1900-01-01"', "date")}
        ${avoidCell(p)}
      </tr>`
    )
    .join("");
  renderTablePicker();
  renderTableJump();
}

// ---------- T1, T2 ... jump buttons ----------
// Round buttons fixed to the left of the screen (#table-jump, style.css): a click scrolls to that family table (just under the
// sticky header) and, once the scrolling has stopped, the table's rows blink once. A table that a filter has emptied is dimmed.
// Only தலைக்கட்டு has tables, and a single table needs no jump.
function renderTableJump() {
  const nav = $("table-jump");
  const families = activeGroup === "thalaikattu" ? familyNumbers() : [];
  nav.hidden = families.length < 2;
  if (nav.hidden) return;
  nav.innerHTML = families.map((n) => {
    const shown = document.querySelectorAll(`#members-body tr[data-person][data-family="${n}"]`).length;
    return `<button type="button" class="table-jump-btn" data-table="${n}" ${shown ? "" : "disabled"} aria-label="Go to table ${n}" title="Table ${n}${shown ? ` - ${shown} member${shown === 1 ? "" : "s"}` : " (hidden by the filter)"}">T${n}</button>`;
  }).join("");
  placeTableJump();
}

// The buttons end 20px before the table. Where the screen has no 20px of room left of the table (anything under ~1750px wide
// the table is nearly at the screen edge) they stay at the screen edge, 4px in, over the table's edge instead of off-screen.
// Measured from the sticky header's wrapper, which is as wide as the table and does not move when the table is scrolled sideways.
function placeTableJump() {
  const nav = $("table-jump");
  if (nav.hidden) return;
  const pad = parseFloat(getComputedStyle(nav).paddingLeft);   // the nav's own padding (style.css): room for the hover zoom and shadow
  const size = nav.firstElementChild.offsetWidth;
  const circleLeft = Math.max(4, $("members-thead-wrap").getBoundingClientRect().left - 20 - size);
  nav.style.left = `${circleLeft - pad}px`;
}
window.addEventListener("resize", placeTableJump);

// Resolves when the page has stopped scrolling (a smooth scroll has no end event in every browser), or after 2 seconds.
function whenScrollStops() {
  return new Promise((resolve) => {
    let last = -1, still = 0;
    const started = performance.now();
    const check = () => {
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      if (still >= 6 || performance.now() - started > 2000) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

async function jumpToTable(n) {
  const rows = [...document.querySelectorAll(`#members-body tr[data-family="${n}"]`)];
  if (!rows.length) return;
  const caption = $("members-caption");   // the first table's bar is not a row (see renderRows)
  const anchor = caption.dataset.family === String(n) ? caption : rows[0];
  const headerBottom = $("members-thead-wrap").getBoundingClientRect().bottom;   // the sticky header covers the top of the page
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY - headerBottom - 6, behavior: reduce ? "auto" : "smooth" });
  await whenScrollStops();
  [...rows, caption].forEach((tr) => {
    tr.classList.remove("table-blink");
    void tr.offsetWidth;   // restart the animation if the same button is pressed twice
    tr.classList.add("table-blink");
  });
  setTimeout(() => [...rows, caption].forEach((tr) => tr.classList.remove("table-blink")), 1100);
}

$("table-jump").addEventListener("click", (e) => {
  const btn = e.target.closest(".table-jump-btn");
  if (btn && !btn.disabled) jumpToTable(Number(btn.dataset.table));
});

async function loadMembers() {
  setStatus("Loading members…", false);
  const { data, error } = await client
    .from("people")
    .select("*")
    .order("member_no", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) {
    setStatus("Error loading members: " + error.message, true);
    return;
  }
  allPeople = data.sort(compareMembers);   // member-order.js
  renderRows();
  prefillNewMemberRow();
  setStatus("", false);
}

// nextMemberNo/nextRollNumber wrap the shared computeNextMemberNo/
// computeNextRollNumber (shared.js) bound to this page's `allPeople` array —
// see shared.js for the Roll Number HEART LOGIC rule.
function nextMemberNo() {
  return computeNextMemberNo(allPeople, activeGroup, activeGroup === "thalaikattu" ? newMemberFamily : null);   // counted inside the picked table
}
function nextRollNumber() {
  return computeNextRollNumber(allPeople);
}

function prefillNewMemberRow() {
  $("new-m-sno").textContent = nextMemberNo();
  $("new-m-roll").textContent = activeGroup === "thalaikattu" ? nextRollNumber() : DONOR_PREFIX + computeNextDonorNo(allPeople);   // தலைக்கட்டு: 1001...; a donor: D1, D2...
  updateNewMemberLock();
}

// insertPersonRaceSafe is now shared with app.js — see shared.js for the
// HEART LOGIC comment covering the stale-list-vs-DB-constraint reasoning.

// New row starts locked (only பெயர்/Name enterable) until a name is typed —
// same pattern as the main Ledger Sheet's new row (see updateNewRowLock in app.js).
// The Others list needs no பெயர் (people.name may be empty there), so its row is open from the start; addNewMember then asks for
// a பெயர் or an English Name.
// Master lock (see setMasterLocked below) further disables the name
// field too, so nothing in this row is editable while the page is locked.
function updateNewMemberLock() {
  const masterLocked = document.body.classList.contains("master-locked");
  const hasName = activeGroup === "others" || $("new-m-name").value.trim().length > 0;
  $("new-m-name").disabled = masterLocked;
  $("new-m-name-en").disabled = masterLocked || !hasName;
  $("new-m-place").disabled = masterLocked || !hasName;
  $("new-m-mobile").disabled = masterLocked || !hasName;
  $("new-m-dob").disabled = masterLocked || !hasName;
  $("new-m-postal-btn").disabled = masterLocked || !hasName;
  $("new-m-table").disabled = masterLocked;
}

// What the add row sends about the list: nothing for தலைக்கட்டு (it is the column's default, and a Roll No. is handed out), and
// for Others the list name plus an explicit empty Roll No. (insertPersonRaceSafe keeps a null roll_number as it is).
const newMemberGroupFields = () => (activeGroup === "others" ? { member_group: "others", roll_number: null } : { family_group: newMemberFamily });

// Picking another table changes the S.No. the new member will get.
$("new-m-table").addEventListener("change", () => {
  newMemberFamily = Number($("new-m-table").value);
  prefillNewMemberRow();
});

// The two list buttons. Switching re-draws the table, so any open cell is saved first (requestRenderRows does that), and the
// add row's S.No. / Roll No. follow the list.
$("group-pills").addEventListener("click", async (e) => {
  const pill = e.target.closest(".pill");
  if (!pill || pill.dataset.group === activeGroup) return;
  activeGroup = pill.dataset.group;
  if (activeGroup === "others") $("filter-dob").value = "";   // hidden for Donors: a leftover filter would silently hide everyone
  await requestRenderRows();   // also rebuilds the table picker (renderRows)
  prefillNewMemberRow();
});

// Forget the Postal Address typed into the add row (after the member is added, or the edit is cancelled).
function clearNewMemberPostal() {
  newMemberDraft.postal_address = null;   // member-address.js
  $("new-m-postal-btn").classList.remove("address-complete");
  $("new-m-postal-town").value = "";
}

// ---------- Cancel editing (the x next to the lock) ----------
// Cells autosave the moment they lose focus, so "cancel" cannot just drop what is on screen: it writes the old values
// back. editSnapshot is taken when the page is unlocked; members ADDED during the session are not in it, so they
// are kept (their own "Added" save is already final).
const EDITABLE_FIELDS = ["name", "name_en", "place", "address", "postal_address", "mobile", "dob", "avoid"];
let editSnapshot = null;
const pendingCommits = new Set();   // saves in flight (see commitCell), so cancel can wait for them

function takeEditSnapshot() {
  editSnapshot = new Map(allPeople.map((p) => [p.id, Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, p[f]]))]));
}

const sameValue = (field, a, b) => (field === "avoid" ? !!a === !!b : (a ?? "") === (b ?? ""));

// Members that differ from the snapshot, with the fields to write back.
function changesSinceUnlock() {
  const changes = [];
  for (const person of allPeople) {
    const before = editSnapshot?.get(person.id);
    if (!before) continue;
    const revert = {};
    EDITABLE_FIELDS.forEach((f) => { if (!sameValue(f, person[f], before[f])) revert[f] = before[f]; });
    if (Object.keys(revert).length) changes.push({ person, revert });
  }
  return changes;
}

async function cancelEditing() {
  await Promise.allSettled([...pendingCommits]);   // clicking this button blurs the cell, which starts a save
  const changes = changesSinceUnlock();
  if (changes.length) {
    const n = changes.length;
    if (!window.confirm(`Undo your changes to ${n} member${n === 1 ? "" : "s"} and lock the page?`)) return;
  }
  const errors = (await Promise.all(changes.map(async ({ person, revert }) => {
    const { error } = await client.from("people").update(revert).eq("id", person.id);
    if (!error) Object.assign(person, revert);
    return error;
  }))).filter(Boolean);
  renderRows();   // redraws from allPeople, which also drops anything typed but not saved
  if (errors.length) {
    setStatus(`Could not undo ${errors.length} change${errors.length === 1 ? "" : "s"}: ${errors[0].message}`, true);
    return;   // still in edit mode so nothing is left half-reverted without the user knowing
  }
  ["new-m-name", "new-m-name-en", "new-m-place", "new-m-mobile", "new-m-dob"].forEach((id) => ($(id).value = ""));
  clearNewMemberPostal();
  setMasterLocked(true);
  setStatus(changes.length ? "Changes undone." : "Cancelled.", false);
}

$("master-cancel-btn").addEventListener("click", cancelEditing);

// Master lock — one global 🔒 in the totals-banner is the sole edit
// gate for the whole page. Unlocking makes every existing cell directly
// editable (no per-cell click needed), the new-member row usable, and
// Avoid checkboxes active. Re-locking commits any in-flight edit and
// makes the whole table read-only again.
// Page starts locked on every load so a fresh open never risks a stray
// tap writing to the DB — the user must explicitly unlock first.
// Coloured badges for the lock button (same white disc + coloured symbol as the other footer buttons, see style.css
// .btn-icon). Both are swapped in by setMasterLocked together with the label.
const footerBadge = (color, paths) =>
  `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#fff"/><g transform="translate(4.2 4.2) scale(0.65)"><g fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${paths}</g></g></svg>`;
const EDIT_BADGE = footerBadge("#f59e0b", '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>');
const LOCK_BADGE = footerBadge("#16a34a", '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>');

function setMasterLocked(locked) {
  if (!locked) takeEditSnapshot();
  document.body.classList.toggle("editing", !locked);   // grey page + cancel button, see style.css
  // Commit any in-flight edit BEFORE flipping readOnly on it — commitCell
  // bails early on readOnly inputs, so the order matters. Commits are
  // fire-and-forget (input.value is already synced to displayValue
  // synchronously; only the DB call is async).
  if (locked) {
    document.querySelectorAll("#members-body .cell-input:not([readonly])").forEach((input) => commitCell(input));
  }
  document.body.classList.toggle("master-locked", locked);
  const btn = $("master-lock-btn");
  // Action-preview: the icon shows what CLICKING will do next, not the
  // current state — 🔒 while editing is enabled means "tap to lock",
  // ✏️ while locked means "tap to enable editing".
  btn.innerHTML = locked ? `${EDIT_BADGE}<span>Edit</span>` : `${LOCK_BADGE}<span>Save &amp; Lock</span>`;
  btn.setAttribute("aria-label", locked ? "Unlock editing" : "Save and lock");
  btn.setAttribute("title", locked ? "Unlock editing" : "Save and lock");
  btn.setAttribute("aria-pressed", locked ? "false" : "true");
  setCellsLocked(locked);
  updateNewMemberLock();
}

$("master-lock-btn").addEventListener("click", () => {
  setMasterLocked(!document.body.classList.contains("master-locked"));
});

// Start locked on every page load — see setMasterLocked comment.
setMasterLocked(true);

// Could not save: say why in the status line and flash the add row red.
function rejectNewMember(message) {
  setStatus(message, true);
  blinkRow($("new-member-row"), "error");
}

async function addNewMember() {
  const name = $("new-m-name").value.trim();
  const nameEn = $("new-m-name-en").value.trim();
  if (!name && !(activeGroup === "others" && nameEn)) {
    // An empty row is not an error: a click anywhere lands here too. Other boxes filled but no name at all is one (Others only).
    const typedSomething = activeGroup === "others" && ["new-m-place", "new-m-mobile", "new-m-dob"].some((id) => $(id).value.trim());
    if (typedSomething) rejectNewMember("A member needs a name: type the பெயர் or the English Name.");
    return;
  }

  const dup = findNameOwner(allPeople, name, nameEn);   // shared.js: the Tamil name, or the English one when there is no Tamil name
  if (dup) {
    rejectNewMember(`"${name || nameEn}" already exists in ${GROUP_LABELS[memberGroupOf(dup)]} (${dup.family_group ? `table ${dup.family_group}, ` : ""}S.No. ${dup.member_no ?? "-"}) — find them there instead of re-adding.`);
    return;
  }

  const mobile = $("new-m-mobile").value.trim().replace(/[^\d+]/g, "");
  const mobileProblem = mobileError(mobile);   // shared.js: exactly 10 digits, or blank
  if (mobileProblem) {
    rejectNewMember(mobileProblem);
    $("new-m-mobile").focus();
    return;
  }

  const { data: person, error } = await insertPersonRaceSafe(client, { name: name || null, name_en: nameEn, place: $("new-m-place").value.trim(), mobile, dob: $("new-m-dob").value || null, postal_address: newMemberDraft.postal_address, ...newMemberGroupFields() });
  if (error) {
    rejectNewMember(personSaveError(error));
    return;
  }

  allPeople.push(person);
  allPeople.sort(compareMembers);
  newMemberFamily = person.family_group ?? newMemberFamily;   // the next new member goes to the same table, a new table included

  ["new-m-name", "new-m-name-en", "new-m-place", "new-m-mobile", "new-m-dob"].forEach((id) => ($(id).value = ""));
  clearNewMemberPostal();
  updateNewMemberLock();
  setStatus("Added.", false);
  blinkRow($("new-member-row"), "ok");   // the add row confirms the save...
  renderRows();
  prefillNewMemberRow();

  const savedTr = $("members-body").querySelector(`tr[data-person="${person.id}"]`);
  if (savedTr) {
    savedTr.scrollIntoView({ behavior: "smooth", block: "center" });
    blinkRow(savedTr, "ok");   // ...and so does the member's new row in the list
  }
}

$("new-m-postal-btn").innerHTML = HOME_ICON_SVG;
$("new-m-name").addEventListener("input", updateNewMemberLock);
$("new-m-mobile").addEventListener("input", () => filterMobileInput($("new-m-mobile")));

// Row stays unsaved while typing — Enter (on any field in the row) commits it,
// and so does clicking/tabbing away to somewhere outside the row entirely.
["new-m-name", "new-m-name-en", "new-m-place", "new-m-mobile", "new-m-dob"].forEach((id) => {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewMember();
    }
  });
});

// Safari doesn't fire blur/focusout when clicking non-interactive elements
// (blank space, plain text, etc.), so a click-anywhere-outside check is done
// at the document level instead of relying on focus events. isInteractiveTarget
// filter (shared.js) skips clicks on filters/pills/buttons/links so the new
// row doesn't auto-commit when the user is trying to click something else.
document.addEventListener("click", (e) => {
  if ($("new-member-row").contains(e.target)) return;
  if (addrPop.contains(e.target)) return;   // the Postal Address popup of the add row: clicking in it must not add the member
  if (isInteractiveTarget(e.target)) return;
  addNewMember();
});

// debounce() lives in shared.js — kept as one copy with app.js.

// renderRows() replaces the whole tbody, which would silently discard any
// cell that's mid-edit (unlocked, not yet committed) — e.g. typing a Name
// correction, then touching a filter box before pressing Enter. Auto-commit
// any open cell first (same save path as clicking away) so filtering never
// loses an edit.
async function requestRenderRows() {
  const unlockedInputs = Array.from(document.querySelectorAll("#members-body .cell-input.unlocked"));
  if (unlockedInputs.length) {
    await Promise.all(unlockedInputs.map((input) => commitCell(input)));
  }
  renderRows();
}
const debouncedRequestRenderRows = debounce(requestRenderRows, FILTER_DEBOUNCE_MS);

// S.No/Roll No./Mobile hold numbers, so their filter boxes only accept the
// kind of input those columns can actually contain — matches how the
// corresponding table cells themselves are already restricted (e.g. new-m-mobile).
// Registered before the render-triggering listeners below so the value is
// already sanitized by the time renderRows() reads it.
$("filter-sno").addEventListener("input", () => filterDigitsInput($("filter-sno")));
$("filter-roll").addEventListener("input", () => filterDigitsInput($("filter-roll")));
$("filter-mobile").addEventListener("input", () => filterMobileInput($("filter-mobile")));

["filter-sno", "filter-roll", "filter-name", "filter-name-en", "filter-place", "filter-postal", "filter-dob", "filter-mobile"].forEach((id) => {
  $(id).addEventListener("input", debouncedRequestRenderRows);
});

// Bulk-toggle every rendered cell's edit state to match the master lock.
// Called from setMasterLocked and after renderRows repaints tbody (fresh
// nodes always start in whatever state cell() rendered for them, but a
// filter/render triggered mid-session needs to re-sync too).
function setCellsLocked(locked) {
  document.querySelectorAll("#members-body .cell-input").forEach((input) => {
    input.readOnly = locked;
    input.classList.toggle("unlocked", !locked);
  });
}

// Save validated input value to Supabase. Lock state is NOT touched here —
// the master lock owns that entirely — so this is now pure "persist +
// validate", callable from Enter/blur/click-outside without side effects
// on the visual lock state. Short-circuits on unchanged values to avoid
// spamming the DB when the user just tabs past unmodified cells.
// Wrapper that remembers the save while it is running, so cancelEditing() can wait for it.
function commitCell(input) {
  const saving = commitCellNow(input);
  pendingCommits.add(saving);
  const done = () => pendingCommits.delete(saving);
  saving.then(done, done);
  return saving;
}

async function commitCellNow(input) {
  if (input.readOnly) return;
  const tr = input.closest("tr");
  const personId = tr.dataset.person;
  const field = input.dataset.field;
  const person = allPeople.find((p) => p.id === personId);
  if (!person) return;
  let value = input.value.trim();
  let displayValue = value;

  // Store raw digits (+prefix allowed), not the display-formatted string with
  // spaces — keeps the DB value usable for search/export/dial-links later.
  // formatMobile() strips whitespace before reformatting either way, so this
  // stays safe to display even for older rows saved with spaces baked in.
  if (field === "mobile") {
    value = value.replace(/[^\d+]/g, "");
    displayValue = formatMobile(value);
    // A changed number must be exactly 10 digits. An untouched old number is left alone (no error on tab-through).
    const problem = value !== (person.mobile ?? "") ? mobileError(value) : null;
    if (problem) {
      setStatus(problem, true);
      input.value = formatMobile(person.mobile);   // put the old number back
      return;
    }
  }

  // A thalaikattu member always has a பெயர். An Others member may have none (people.name is then empty), but never both names empty.
  const nameWouldVanish = (field === "name" && !value && (isThalaikattu(person) || !person.name_en)) || (field === "name_en" && !value && !person.name);
  if (nameWouldVanish) {
    setStatus(field === "name" ? "Name cannot be empty." : "A member needs a name: type the பெயர் first.", true);
    input.value = person[field] ?? "";
    return;
  }
  if ((field === "name" && value) || (field === "name_en" && value && !person.name)) {
    const dup = findNameOwner(allPeople, field === "name" ? value : "", field === "name_en" ? value : "", personId);
    if (dup) {
      setStatus(`"${value}" is already used by another member (S.No. ${dup.member_no ?? "-"}).`, true);
      input.value = person.name ?? "";
      return;
    }
  }

  input.value = displayValue;

  // No change → no write. Every unlocked cell would otherwise "commit"
  // on every blur/click-away, even if the user never typed a thing.
  const dbValue = value === "" && (field === "dob" || field === "name") ? null : value;   // an emptied date (or an Others member's emptied பெயர்) is NULL, not an empty string
  if ((person[field] ?? "") === value) return;   // ?? "": an empty (null) cell left empty is not a change

  const { error } = await trackedSave(client.from("people").update({ [field]: dbValue }).eq("id", personId));
  if (error) {
    setStatus(personSaveError(error), true);
    return;
  }
  person[field] = dbValue;
  setStatus("Saved.", false);
}

$("members-body").addEventListener("input", (e) => {
  if (!e.target.classList.contains("cell-input") || e.target.dataset.field !== "mobile") return;
  filterMobileInput(e.target);
});

// The spaces in a mobile number are for reading only: while a cell is being edited it shows the plain digits, and
// commitCell() (on leaving the cell) puts the spacing back.
$("members-body").addEventListener("focusin", (e) => {
  const input = e.target;
  if (!input.classList?.contains("cell-input") || input.dataset.field !== "mobile" || input.readOnly) return;
  input.value = input.value.replace(/\s+/g, "");
});

$("members-body").addEventListener("change", async (e) => {
  if (!e.target.classList.contains("avoid-check")) return;
  const checkbox = e.target;
  // CSS pointer-events:none already blocks the click while master-locked,
  // but a scripted checkbox.click() or a keyboard toggle could still fire
  // — revert and bail before any DB write.
  if (document.body.classList.contains("master-locked")) {
    checkbox.checked = !checkbox.checked;
    return;
  }
  const tr = checkbox.closest("tr");
  const personId = tr.dataset.person;
  const value = checkbox.checked;
  // Confirm before marking someone Avoid — this hides them from every
  // future Ledger Sheet (see peopleForCurrentFunction in app.js), so an
  // accidental click on the wrong row shouldn't be a silent one-way write.
  // Uncheck is confirmed too, since it changes their visibility across
  // every function's sheet.
  const person = allPeople.find((p) => p.id === personId);
  const label = (person && displayName(person)) || "this member";
  const prompt = value
    ? `Mark "${label}" as no longer active?\n\nThey'll be hidden from every current and future function's Ledger Sheet (except sheets where they already have a saved row).`
    : `Restore "${label}" to the active member list?\n\nThey'll reappear on every function's Ledger Sheet.`;
  if (!window.confirm(prompt)) {
    checkbox.checked = !value;
    return;
  }
  const { error } = await client.from("people").update({ avoid: value }).eq("id", personId);
  if (error) {
    setStatus("Error saving: " + error.message, true);
    checkbox.checked = !value;
    return;
  }
  if (person) person.avoid = value;
  tr.classList.toggle("row-avoided", value);
  setStatus("Saved.", false);
});

// Enter commits without needing to leave the field (blur then also fires,
// but commitCell's dirty-check makes the second call a cheap no-op).
$("members-body").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const input = e.target.closest(".cell-input");
  if (!input || input.readOnly) return;
  e.preventDefault();
  input.blur();
});

// Tab/click to another field.
$("members-body").addEventListener("focusout", (e) => {
  const input = e.target.closest(".cell-input");
  if (!input || input.readOnly) return;
  commitCell(input);
});

// Safari doesn't fire blur/focusout when clicking non-interactive elements
// (blank space, plain text, etc.), so also catch clicks anywhere outside
// the currently-focused cell at the document level. Only the focused input
// needs committing — every other cell is either already saved (via a prior
// focusout) or unchanged, and commitCell's dirty-check would no-op anyway.
// isInteractiveTarget filter (shared.js) skips clicks on filters/pills/
// buttons/links so tapping them doesn't accidentally short-circuit focus.
document.addEventListener("click", (e) => {
  if (isInteractiveTarget(e.target)) return;
  const focused = document.activeElement;
  if (!focused || !focused.classList?.contains("cell-input") || focused.readOnly) return;
  const wrapper = focused.closest(".cell-flex");
  if (wrapper && !wrapper.contains(e.target)) commitCell(focused);
});

// Tab hidden or closed while a cell is still being typed in: save it now (see shared.js). Cells normally save on blur.
registerLeaveSaver(() => {
  const focused = document.activeElement;
  if (focused?.classList?.contains("cell-input") && !focused.readOnly) commitCell(focused);
});

loadMembers();
