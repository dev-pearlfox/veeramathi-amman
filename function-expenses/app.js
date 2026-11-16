const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let people = [];
let functionsList = [];
let ledgerEntries = [];
let selectedFunctionId = null;
// Whether the user has toggled the ledger table closed via the members
// count button — preserved across re-renders so a follow-up render
// (adding a new row, switching function, save success, etc.) doesn't
// un-hide the table behind their back.
let sheetCollapsed = false;
const saveTimers = {};

const $ = (id) => document.getElementById(id);

function setStatus(id, message, isError) {
  const el = $(id);
  el.textContent = message || "";
  el.className = "status " + (isError ? "error" : "ok");
}

// escapeHtml, formatMobile, filterMobileInput, syncHeaderTitleCollapse live
// in shared.js (loaded before this file) — kept as one copy with members.js.

// ---------- Login gate (Supabase Auth) ----------
// Shared admin login: users only type a password, the email is fixed in
// supabase-config.js (ADMIN_EMAIL). Supabase persists the session in
// localStorage automatically, so members.html sees the same session and
// refreshes across tabs / reloads don't force re-login until the JWT
// expires (default 1 hour, auto-refreshed by supabase-js).

$("gate-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("gate-password").value;
  setStatus("gate-status", "Signing in...", false);
  const { error } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });
  if (error) {
    // Don't leak which of email/password was wrong — Supabase already
    // returns a generic "Invalid login credentials" for that reason.
    setStatus("gate-status", error.message || "Sign-in failed.", true);
    return;
  }
  unlockApp();
});

function unlockApp() {
  // Clear the password field so it doesn't sit in memory / can't be
  // recovered from the DOM after the gate is hidden.
  $("gate-password").value = "";
  $("gate").classList.add("hidden");
  $("app").classList.remove("hidden");
  // #app is display:none behind the gate, so header h1's offsetHeight read
  // as 0 when syncHeaderTitleCollapse() ran on the page's "load" event —
  // its only other triggers are resize/fonts.ready, neither of which fires
  // just from unhiding #app — leaving --header-h1-margin-collapse stuck at
  // 0px for the rest of the session. Re-run it now that h1 is actually
  // laid out, so the scrolled-state header height genuinely shrinks to fit
  // the (now correctly measured) title instead of just visually scaling
  // without reclaiming the freed space.
  syncHeaderTitleCollapse();
  // #gate-password's autofocus can scroll the page on short (mobile) viewports, and that residual scroll position does not
  // reset by itself once #gate is hidden and #app appears, so put it back at the top.
  window.scrollTo(0, 0);
  loadAll();
}

// Auto-unlock if a Supabase session already exists (returning visitor
// whose JWT hasn't expired, or someone who just logged in on members.html
// and came back). getSession() reads from localStorage synchronously
// under the hood but the API is async — we fire-and-forget here so the
// rest of the script can keep initializing without awaiting at top level.
client.auth.getSession().then(({ data: { session } }) => {
  if (session) unlockApp();
});

// If the session is revoked/expires while the app is open (e.g. signOut
// from another tab), bounce back to the gate instead of leaving a
// dead-authenticated UI that silently 401s on every request.
client.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    $("app").classList.add("hidden");
    $("gate").classList.remove("hidden");
    $("gate-password").value = "";
    setStatus("gate-status", "", false);
  }
});

// Logout button lives in the header (right end). signOutAndReload (shared.js)
// reloads after signOut so no stale in-memory state (open cells,
// debounced timers, cached data) survives past a logout.
$("logout-btn").addEventListener("click", () => {
  if (!window.confirm("Sign out?")) return;
  signOutAndReload(client);
});

// ---------- Scroll-compact shrink ----------
// Same architecture as members.html (see that file's HEART LOGIC index for
// the full reasoning): header + pills + #sheet-title + the ledger sheet's
// own thead all live in one shared .sticky-top-stack (style.css). .pills-
// inline and #sheet-title each shrink via transform:scale() (same
// technique as .members-filter-card — the whole element shrinks as one
// compositor-only unit instead of animating individual children's padding/
// font-size), so each needs its own JS-measured margin-collapse below.
// Measures .pills-inline specifically, not .sheet-filter-card itself —
// that outer card's own width must stay fixed at all times to keep
// matching the spreadsheet's width below it (see .sheet-filter-card's own
// comment in style.css), so it can't be the thing that scales. SCALE here
// must match body.is-compact .pills-inline's scale() in style.css.
const SHEET_FILTER_CARD_COMPACT_SCALE = 0.75;
function syncSheetFilterCardCollapse() {
  const pillsInline = document.querySelector(".pills-inline");
  if (!pillsInline) return;
  const collapse = -(pillsInline.offsetHeight * (1 - SHEET_FILTER_CARD_COMPACT_SCALE));
  document.documentElement.style.setProperty("--sheet-filter-card-margin-collapse", collapse + "px");
}
window.addEventListener("resize", syncSheetFilterCardCollapse);
window.addEventListener("load", syncSheetFilterCardCollapse);
if (document.fonts) document.fonts.ready.then(syncSheetFilterCardCollapse);
syncSheetFilterCardCollapse();
// The number of function pills (and thus how many lines they wrap onto) changes
// whenever functions are added or the user picks a different one — re-measuring only
// on load/resize left the card's real height uncorrected after that, the
// same undershoot bug fixed for members.html's pills card.
const sheetFilterCard = document.querySelector(".pills-inline");
if (sheetFilterCard) new MutationObserver(syncSheetFilterCardCollapse).observe(sheetFilterCard, { childList: true, subtree: true, characterData: true });

// #function-pills and #sheet-title's own text span both use
// nowrap + horizontal scroll once compact (style.css) so their content
// never wraps mid-line — but that means an overflowing one's tail end
// gets sliced off flat at the card's edge instead of ending cleanly.
// has-overflow toggles a CSS mask (style.css) that fades that edge into a
// "more content, scroll for it" cue instead — only applied when there's
// actually something to scroll to, so one that already fits (most year
// lists, most function names) is left untouched.
function syncPillRowOverflow() {
  document.querySelectorAll(".sheet-filter-card .pill-row, .sheet-title-inner > span").forEach((row) => {
    row.classList.toggle("has-overflow", row.scrollWidth > row.clientWidth + 1);
  });
}
window.addEventListener("resize", syncPillRowOverflow);
window.addEventListener("load", syncPillRowOverflow);
if (document.fonts) document.fonts.ready.then(syncPillRowOverflow);
syncPillRowOverflow();
if (sheetFilterCard) new MutationObserver(syncPillRowOverflow).observe(sheetFilterCard, { childList: true, subtree: true, characterData: true });

// Same transform:scale() + margin-collapse technique as
// syncSheetFilterCardCollapse above, for #sheet-title (the function
// name/year heading + குடும்பத் தலைவர்கள் toggle button). SCALE here must match
// body.is-compact #sheet-title's scale() in style.css.
const SHEET_TITLE_COMPACT_SCALE = 0.7;
function syncSheetTitleCollapse() {
  // Deferred one frame: .sheet-title-inner's width is calc(100%/0.7) of
  // #sheet-title (style.css), and right when this runs off the
  // updateSheetTitle() MutationObserver — synchronously, in the same
  // microtask as the innerHTML change that triggered it — that percentage
  // can still resolve against a not-yet-settled layout, measuring a
  // taller-than-real offsetHeight (confirmed directly: called once inline
  // it read 90px/-27px margin-collapse for a title that actually renders
  // at 44px/-13.2px once layout has genuinely settled, calling it again
  // moments later). Waiting a frame lets the browser finish laying out
  // the new content before measuring it, same fix in spirit as the
  // is-compact toggle immediately below being synchronous.
  requestAnimationFrame(() => {
    const title = document.getElementById("sheet-title");
    if (!title) return;
    // The page is always in the compact state (body.is-compact), so this is simply the real height of the title as shown.
    const scrolledHeight = title.offsetHeight;
    const collapse = -(scrolledHeight * (1 - SHEET_TITLE_COMPACT_SCALE));
    document.documentElement.style.setProperty("--sheet-title-margin-collapse", collapse + "px");
  });
}
window.addEventListener("resize", syncSheetTitleCollapse);
window.addEventListener("load", syncSheetTitleCollapse);
if (document.fonts) document.fonts.ready.then(syncSheetTitleCollapse);
syncSheetTitleCollapse();
// updateSheetTitle() replaces #sheet-title's entire innerHTML (new function
// name/year, new குடும்பத் தலைவர்கள் count) every time the user picks a different
// year/function — same re-measure-on-content-change need as the pills card.
const sheetTitleEl = document.getElementById("sheet-title");
if (sheetTitleEl) new MutationObserver(syncSheetTitleCollapse).observe(sheetTitleEl, { childList: true, subtree: true, characterData: true });
// Belt-and-suspenders on top of the MutationObserver+rAF above: measured
// directly (not just theorized) that the very first post-mutation
// measurement can still land on a transient, too-tall value that never
// self-corrects on its own afterward — confirmed by re-calling
// syncSheetTitleCollapse() manually well after the fact and getting a
// smaller, stable number instead. Rather than chase the exact async cause
// (font shaping/metrics finishing late is the leading suspect, but
// document.fonts.ready is already wired above and didn't catch it),
// ResizeObserver reacts to the actual outcome — #sheet-title's real
// rendered size changing, whatever the reason — so it self-corrects
// whenever that settles, instead of gambling on one specific timing hook
// being the right one. margin-bottom (what this writes) doesn't affect
// #sheet-title's own border-box size, so this can't retrigger itself.
if (sheetTitleEl) new ResizeObserver(syncSheetTitleCollapse).observe(sheetTitleEl);
if (sheetTitleEl) new MutationObserver(syncPillRowOverflow).observe(sheetTitleEl, { childList: true, subtree: true, characterData: true });

// ---------- Data loading ----------

async function loadAll() {
  // people and functions do not depend on each other: one round trip instead of two. The pills (whose title shows
  // the member count) are drawn once both are in.
  await Promise.all([loadPeople(), loadFunctions()]);
  renderFunctionPills();
  await loadLedgerEntries();
}

async function loadPeople() {
  const { data, error } = await client.from("people").select("*").order("member_no", { ascending: true, nullsFirst: false }).order("name");
  if (error) {
    setStatus("sheet-status", "Error loading members: " + error.message, true);
    return;
  }
  people = data;
}

async function loadFunctions() {
  const { data, error } = await client.from("functions").select("*").order("year", { ascending: false });
  if (error) {
    setStatus("sheet-status", "Error loading functions: " + error.message, true);
    return;
  }
  functionsList = data;
}

// One pill per function, oldest year first ("தை திருவிழா (2026)", "தை திருவிழா (2027)"): a single tap picks the year and
// the function together. (The database hands them back newest first, so they are sorted here.)
const functionPillLabel = (f) => `${f.name} (${f.year})`;
const pillOrder = () => [...functionsList].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));

function renderFunctionPills() {
  const funcs = pillOrder();
  if (!funcs.some((f) => f.id === selectedFunctionId)) {
    // Nothing (valid) picked yet: this year's first function, or the newest year's if this year has none.
    const thisYear = new Date().getFullYear();
    const year = funcs.some((f) => f.year === thisYear) ? thisYear : funcs.at(-1)?.year;
    selectedFunctionId = funcs.find((f) => f.year === year)?.id ?? null;
  }
  $("function-pills").innerHTML = funcs
    .map((f) => `<button type="button" class="pill ${f.id === selectedFunctionId ? "active" : ""}" data-function="${f.id}">${escapeHtml(functionPillLabel(f))}</button>`)
    .join("");
  updateSheetTitle();
}

function updateSheetTitle() {
  const f = functionsList.find((f) => f.id === selectedFunctionId);
  const title = f ? `${f.name} (${f.year})` : "Ledger Sheet";
  // Sets .sheet-title-inner's content, not #sheet-title's own — #sheet-
  // title itself is a fixed, permanent outer box (style.css) that always
  // exactly matches the spreadsheet's width, so its left edge never
  // drifts; .sheet-title-inner is the part that actually scales/shrinks
  // once compact.
  $("sheet-title").querySelector(".sheet-title-inner").innerHTML =
    `<span>${escapeHtml(title)}</span>` +
    // Print / save as PDF: on the title's own line, at its right end (style.css .print-btn); print.js.
    (f ? printButtonHtml() : "") +
    // The வரவு and செலவு buttons sit together on the line(s) below the title (style.css .title-actions).
    `<div class="title-actions">` +
      // வரவு (income) is a label with its buttons in one group, so the label never wraps away from them. The
      // group is a <div>/<strong>, not a direct-child <span>, on purpose: style.css and syncPillRowOverflow
      // treat the title's direct-child <span> as the title TEXT.
      `<div class="title-group"><strong class="title-group-label">வரவு:</strong>` +
        `<button type="button" id="toggle-members-btn" class="members-toggle ${sheetCollapsed ? "" : "active"}">தலைக்கட்டு - ${peopleForCurrentFunction().length}</button>` +
        incomeButtonsHtml() +   // income.js: the extra வரவு buttons (INCOME_KINDS)
      `</div>` +
      // செலவு (expense): one button; its table (income.js, EXPENSE_KIND) replaces the members sheet while it is open.
      expenseButtonHtml() +
    `</div>`;
  // Respect the user's collapse toggle across re-renders — updateSheetTitle
  // is called after adding a row / switching function / saving, and used to
  // unconditionally un-hide the sheet, popping it back open behind the
  // user's back. Now driven by sheetCollapsed state instead.
  applySheetVisibility();
  syncIncomeView();    // income.js: keeps the செலவு / வரவு table in step with the selected function
}

// The members sheet is hidden when the user collapsed it OR the செலவு table or an income table is showing instead. .sheet-thead-wrap
// lives in .sticky-top-stack and .sheet-tbody-wrap in <main> (see that HEART LOGIC comment in style.css), so both
// need toggling together. Also sets the active look of the members and செலவு buttons.
function applySheetVisibility() {
  const hide = sheetCollapsed || !!incomeView;
  $("sheet-tbody-wrap").classList.toggle("hidden", hide);
  $("sheet-thead-wrap").classList.toggle("hidden", hide);
  $("toggle-members-btn")?.classList.toggle("active", !hide);
}

$("sheet-title").addEventListener("click", (e) => {
  if (!e.target.closest("#toggle-members-btn")) return;
  // From the செலவு or an income view this button just goes back to the members sheet; otherwise it
  // collapses/expands the sheet as before.
  sheetCollapsed = incomeView ? false : !sheetCollapsed;
  setIncomeView(null);     // income.js: leaves the செலவு / வரவு view and runs applySheetVisibility()
});

// Switching function: first finish saving what was typed (it belongs to the function being left, and the next
// load must see it), then switch.
$("function-pills").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-function]");
  if (!btn) return;
  await flushPendingCellSaves();
  selectedFunctionId = btn.dataset.function;
  renderFunctionPills();
  await loadLedgerEntries();
});

async function loadLedgerEntries() {
  const funcId = selectedFunctionId;
  if (!funcId) {
    ledgerEntries = [];
    $("sheet-body").innerHTML = "";
    return;
  }
  const { data, error } = await client.from("ledger_entries").select("*").eq("function_id", funcId);
  if (funcId !== selectedFunctionId) return;   // the user clicked another pill while this was loading: that load wins
  if (error) {
    setStatus("sheet-status", "Error loading sheet: " + error.message, true);
    return;
  }
  ledgerEntries = data;
  renderSheet();
}

// ---------- Sheet rendering ----------

// Every function's Ledger Sheet lists all members except those marked "Avoid".
// HEART LOGIC — "Avoid" (set on the members page) means the person is no
// longer active (e.g. deceased). They're hidden from this and every future
// function's Ledger Sheet, EXCEPT a function where they already have an
// existing ledger_entries row — that historical record stays visible.
function peopleForCurrentFunction() {
  const f = functionsList.find((f) => f.id === selectedFunctionId);
  // The rule itself (the "avoid" flag) lives in ../function-rules.js, shared with the dashboard.
  // ledgerEntries here are already only this function's rows.
  return eligiblePeople(people, f, ledgerEntries);
}

// தலைக்கட்டு வரி (stored as "santha") is a fixed price the admin sets per function (Dashboard) — house heads are
// just ticked/unticked here, never allowed to type a custom amount.
function currentSanthaAmount() {
  const f = functionsList.find((f) => f.id === selectedFunctionId);
  return Number(f?.santha_amount ?? 1000);
}

// S.No. shown on this sheet is a plain running count for whoever's actually on
// it — not the person's permanent member_no, which has gaps once a function's
// people-Type restriction excludes some members.
function entryRows() {
  const entryMap = Object.fromEntries(ledgerEntries.map((e) => [e.person_id, e]));
  return peopleForCurrentFunction().map((p, idx) => ({
    p,
    seq: idx + 1,
    e: entryMap[p.id] || { receipt_no: "", santha: 0, santha_checked: false, total: 0, paid: "" },
  }));
}

// The ஊர் filter is a dropdown of the places actually on this sheet (A-Z), so nobody has to type a spelling.
// Options are rebuilt only when the list changes, so an open dropdown is never disturbed. A place that has
// vanished (another function was picked) quietly goes back to அனைத்தும்.
function fillPlaceFilter(rows) {
  const select = $("filter-place");
  const places = [...new Set(rows.map(({ p }) => (p.place || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ta"));
  const signature = places.join("\n");
  if (select.dataset.signature === signature) return;
  const keep = places.includes(select.value) ? select.value : "";
  select.innerHTML = `<option value="">அனைத்தும்</option>` + places.map((pl) => `<option value="${escapeHtml(pl)}">${escapeHtml(pl)}</option>`).join("");
  select.value = keep;
  select.dataset.signature = signature;
}

function renderSheet() {
  const rows = entryRows();
  const santhaAmount = currentSanthaAmount();

  const snoQ = $("filter-sno").value.trim().toLowerCase();
  const nameQ = $("filter-name").value.trim().toLowerCase();
  fillPlaceFilter(rows);
  const placeQ = $("filter-place").value;
  const receiptQ = $("filter-receipt").value.trim().toLowerCase();
  const mobileQ = $("filter-mobile").value.replace(/\s+/g, "");
  const santhaQ = $("filter-santha").value;

  const visible = rows.filter(({ p, seq, e }) => {
    if (snoQ && !String(seq).includes(snoQ)) return false;
    if (nameQ && !(p.name || "").toLowerCase().includes(nameQ)) return false;
    if (placeQ && (p.place || "").trim() !== placeQ) return false;
    if (mobileQ && !String(p.mobile ?? "").replace(/\s+/g, "").includes(mobileQ)) return false;
    if (receiptQ && !String(e.receipt_no || "").toLowerCase().includes(receiptQ)) return false;
    if (santhaQ === "paid" && !e.santha_checked) return false;
    if (santhaQ === "unpaid" && e.santha_checked) return false;
    return true;
  });

  $("sheet-body").innerHTML = visible
    .map(({ p, seq, e }) => { const who = p.name; return `<tr data-person="${p.id}">
        <td>${seq}</td>
        <td><input type="text" class="f-receipt" ${ariaLabelAttr(SHEET_LABELS.receipt, who)} value="${escapeHtml(e.receipt_no || "")}" inputmode="numeric" /></td>
        <td><input type="text" class="f-name" ${ariaLabelAttr(SHEET_LABELS.name, who)} value="${escapeHtml(p.name)}" readonly /></td>
        <td><input type="text" class="f-place" ${ariaLabelAttr(SHEET_LABELS.place, who)} value="${escapeHtml(p.place ?? "")}" readonly /></td>
        <td><input type="text" class="f-mobile" ${ariaLabelAttr(SHEET_LABELS.mobile, who)} value="${escapeHtml(formatMobile(p.mobile))}" readonly /></td>
        <td>
          <div class="santha-cell">
            <input type="checkbox" class="f-santha-check" ${ariaLabelAttr(SHEET_LABELS.santha, who)} data-amount="${santhaAmount}" ${e.santha_checked ? "checked" : ""} />
            <span class="santha-amount ${e.santha_checked ? "" : "faded"}">${formatMoney(santhaAmount)}</span>
          </div>
        </td>
        <td class="note-cell"><input type="hidden" class="f-paid" value="${escapeHtml(e.paid || "")}" />${noteButton(e.paid || "", who)}</td>
      </tr>`; })
    .join("");

  updateTotalsBanner(rows);
}

// Column names for the row controls' accessible labels (same words as the table header in index.html).
const SHEET_LABELS = { receipt: "இரசீது எண்", name: "பெயர்", place: "ஊர்", mobile: "மொபைல் எண்", santha: "தலைக்கட்டு வரி" };

function updateTotalsBanner(rows) {
  // Collected = what is ticked so far; / total = every head on this sheet paying the head tax; Need = the part still to collect
  const collected = rows.reduce((sum, { e }) => sum + Number(e.total), 0);
  $("totals-total").textContent = formatMoney(collected);
  const expected = rows.length * currentSanthaAmount();
  $("totals-expected").textContent = formatMoney(expected);
  $("totals-need").textContent = formatMoney(Math.max(expected - collected, 0));   // still to collect
}

// #sheet-thead-wrap itself doesn't scroll horizontally (overflow:hidden —
// same reasoning as members.html's .members-thead-wrap) so a horizontal
// drag on the body table mirrors onto it here, keeping columns aligned on
// narrow screens (this table has a mobile min-width, same as members.html's).
$("sheet-tbody-wrap").addEventListener("scroll", () => {
  $("sheet-thead-wrap").scrollLeft = $("sheet-tbody-wrap").scrollLeft;
});

// Debounced re-render so fast typing in a filter doesn't force a full
// re-render on every keystroke — and flushes any in-flight debounced
// cell saves first, so a value the user just typed into an f-receipt/
// paid input isn't lost when innerHTML gets replaced. debounce()
// itself lives in shared.js (used by both pages).
// Returns a promise that settles when those saves are done (the pill handlers wait for it).
function flushPendingCellSaves() {
  const saves = Object.keys(saveTimers).map((personId) => {
    const { timer, funcId, tr } = saveTimers[personId];
    clearTimeout(timer);
    delete saveTimers[personId];
    return saveRow(personId, tr, funcId);
  });
  return Promise.allSettled(saves);   // a failed save already shows its own error; it must not stop the pill switch
}
registerLeaveSaver(flushPendingCellSaves);   // shared.js: also runs when the tab is hidden or closed
function requestRenderSheet() {
  flushPendingCellSaves();
  renderSheet();
}
const debouncedRequestRenderSheet = debounce(requestRenderSheet, FILTER_DEBOUNCE_MS);

[
  "filter-sno",
  "filter-name",
  "filter-mobile",
  "filter-receipt",
].forEach((id) => $(id).addEventListener("input", debouncedRequestRenderSheet));
// The santha filter is a <select> — change fires once per commit, no need
// to debounce or flush (its transition is intentional, not typing).
$("filter-santha").addEventListener("change", renderSheet);
$("filter-place").addEventListener("change", renderSheet);

// One row's money is just the ticked தலைக்கட்டு வரி. It is still saved as `total` (the Dashboard sums that column);
// there is no மொத்தம் column on screen any more, since it would only repeat the head tax.
const rowTotal = (v) => v.santha;

function rowValues(tr) {
  const santhaCheck = tr.querySelector(".f-santha-check");
  return {
    receipt_no: tr.querySelector(".f-receipt").value.trim(),
    santhaChecked: santhaCheck.checked,
    santha: santhaCheck.checked ? Number(santhaCheck.dataset.amount) : 0,
    paid: tr.querySelector(".f-paid").value.trim(),
  };
}

// funcId is the function the row belonged to when it was edited (scheduleSave captures it), NOT whatever pill is
// selected by the time a debounced save fires.
async function saveRow(personId, tr, funcId) {
  const v = rowValues(tr);
  const total = rowTotal(v);

  const payload = {
    function_id: funcId,
    person_id: personId,
    receipt_no: v.receipt_no,
    santha: v.santha,
    santha_checked: v.santhaChecked,
    total,
    paid: v.paid,
  };
  const { error } = await trackedSave(client.from("ledger_entries").upsert(payload, { onConflict: "function_id,person_id" }));
  if (error) {
    setStatus("sheet-status", "Error saving row: " + error.message, true);
    return;
  }
  if (funcId !== selectedFunctionId) return;   // saved, but another function is on screen now: nothing here to update
  setStatus("sheet-status", "", false);
  tr.classList.add("row-saved");
  setTimeout(() => tr.classList.remove("row-saved"), ROW_SAVE_BLINK_MS);
  const idx = ledgerEntries.findIndex((e) => e.person_id === personId);
  if (idx >= 0) ledgerEntries[idx] = { ...ledgerEntries[idx], ...payload };
  else ledgerEntries.push(payload);
  updateTotalsBanner(entryRows());
}

function scheduleSave(personId, tr, immediate) {
  const funcId = selectedFunctionId;   // captured now, see saveRow
  clearTimeout(saveTimers[personId]?.timer);
  if (immediate) {
    delete saveTimers[personId];
    saveRow(personId, tr, funcId);
  } else {
    const timer = setTimeout(() => {
      delete saveTimers[personId];
      saveRow(personId, tr, funcId);
    }, SAVE_DEBOUNCE_MS);
    saveTimers[personId] = { timer, funcId, tr };
  }
}

$("sheet-body").addEventListener("input", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  scheduleSave(tr.dataset.person, tr, false);
});

$("sheet-body").addEventListener("change", (e) => {
  if (!e.target.classList.contains("f-santha-check")) return;
  const tr = e.target.closest("tr");
  tr.querySelector(".santha-amount").classList.toggle("faded", !e.target.checked);
  scheduleSave(tr.dataset.person, tr, true);
});
