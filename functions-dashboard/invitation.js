// Admin tab, "Invitation" card: pick a function (the accounts year to print), then Preview or Print the invitation
// booklet. The booklet itself is built by invitation-pages.js and styled by invitation.css; this file only wires the
// card, the full-screen preview and the print. renderInvitationCard() is called from renderAdmin() (admin.js).
//
// The booklet is built once per pick and kept while the preview is closed, so what was edited in it (every page is
// editable) is still there when it is reopened or printed. Picking a pill again builds it fresh from the latest data.

let invFunctionId = null;   // the picked function
let invBuiltFor = null;     // the function whose booklet is in #inv-sheets right now
let invPageNo = 1;          // the page the preview shows (it shows one page at a time)
let invPageCount = 0;
let invTitlesFitted = false;   // the titles of the booklet in #inv-sheets have been fitted to one row

// The invitation is for the festival the year AFTER the accounts year (2026 accounts -> the January 2027 festival), so the
// card names each function by that festival year. The data itself (f.year) stays the accounts year.
const invFunctionLabel = (f) => `${f.name} (${f.year + 1})`;
const invOrderedFunctions = () => [...functionsList].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));   // oldest year first, like the Accounts pills
const invPickedFunction = () => functionsList.find((f) => f.id === invFunctionId);

function renderInvitationCard() {
  const funcs = invOrderedFunctions();
  if (!invPickedFunction()) { invFunctionId = null; invBuiltFor = null; }
  $("inv-pills").innerHTML = funcs
    .map((f) => `<button type="button" class="pill ${f.id === invFunctionId ? "active" : ""}" data-fn="${f.id}" aria-pressed="${f.id === invFunctionId}">${escapeHtml(invFunctionLabel(f))}</button>`)
    .join("");
  $("inv-preview").disabled = !invFunctionId;
  $("inv-hint").textContent = invFunctionId ? "" : funcs.length ? "Pick a function to enable Preview." : "Add a function first.";
}

function invEnsureBuilt() {
  if (invBuiltFor === invFunctionId) return;
  const f = invPickedFunction();
  const { sheets, pageCount } = buildInvitation(f);
  $("inv-sheets").innerHTML = sheets;
  invPageCount = pageCount;
  $("inv-bar-title").textContent = `Invitation: ${invFunctionLabel(f)} (${pageCount} pages)`;
  invBuiltFor = invFunctionId;
  invTitlesFitted = false;
  showInvitationPage(1);
}

// The preview shows one page at a time. Every page stays in the page (just hidden), so edits survive moving around
// and the print still gets the whole booklet.
function showInvitationPage(n) {
  invPageNo = Math.min(Math.max(1, n), invPageCount);
  document.querySelectorAll("#inv-sheets .inv-page").forEach((p) => p.classList.toggle("current", Number(p.dataset.page) === invPageNo));
  $("inv-page-pos").textContent = `Page ${invPageNo} of ${invPageCount}`;
  $("inv-prev").disabled = invPageNo === 1;
  $("inv-next").disabled = invPageNo === invPageCount;
  $("inv-sheets").scrollTop = 0;
}

// Each title box belongs on one row. A title too long for it gets a smaller font, just enough to fit; shorter ones
// keep the normal size. Needs the pages laid out (all are shown for a moment) and the Tamil font loaded, or the
// widths would be those of the fallback font.
async function invFitTitles() {
  if (invTitlesFitted) return;
  const box = $("inv-sheets");
  box.classList.add("inv-measuring");
  void box.offsetWidth;                // lay the pages out, which starts loading their fonts
  await document.fonts.ready;
  box.querySelectorAll(".inv-title").forEach((title) => {
    title.style.fontSize = "";
    const normal = parseFloat(getComputedStyle(title).fontSize);
    title.style.whiteSpace = "nowrap";
    title.style.maxWidth = "none";
    const room = title.parentElement.clientWidth, need = title.offsetWidth;
    title.style.whiteSpace = title.style.maxWidth = "";
    if (need > room) title.style.fontSize = `${((normal * room) / need) * 0.97}px`;
  });
  box.classList.remove("inv-measuring");
  invTitlesFitted = true;
}

// A page is 9 x 12 in (864 x 1152 px); it is shrunk so the whole page fits the window (never enlarged).
function invFitPage() {
  const box = $("inv-sheets");
  const zoom = Math.min(1, (box.clientWidth - 24) / (INV.pageW * 96), (box.clientHeight - 28) / (INV.pageH * 96));
  document.documentElement.style.setProperty("--inv-zoom", String(Math.max(0.2, zoom)));
}

async function openInvitationPreview() {
  invEnsureBuilt();
  $("inv-overlay").classList.add("open");
  document.body.classList.add("inv-open");
  invFitPage();
  $("inv-bar-close").focus();
  await invFitTitles();
}

function closeInvitationPreview() {
  $("inv-overlay").classList.remove("open");
  document.body.classList.remove("inv-open");
}

// Fonts load only once text is on screen, so the booklet is shown (print CSS) and the fonts are awaited before the
// print dialog opens; otherwise the first print could come out in a fallback font.
async function printInvitation() {
  invEnsureBuilt();
  await invFitTitles();
  const originalTitle = document.title;
  document.title = `Invitation ${invFunctionLabel(invPickedFunction())}`;   // the browser's default PDF file name
  document.body.classList.add("inv-printing");
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("inv-printing");
    document.title = originalTitle;
  }, { once: true });
  window.print();
}

$("inv-pills").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-fn]");
  if (!btn) return;
  invFunctionId = btn.dataset.fn;
  invBuiltFor = null;   // a fresh build for every pick
  renderInvitationCard();
});
$("inv-preview").addEventListener("click", openInvitationPreview);
$("inv-bar-print").addEventListener("click", printInvitation);
$("inv-bar-close").addEventListener("click", closeInvitationPreview);
$("inv-prev").addEventListener("click", () => showInvitationPage(invPageNo - 1));
$("inv-next").addEventListener("click", () => showInvitationPage(invPageNo + 1));
document.addEventListener("keydown", (e) => {
  if (!$("inv-overlay").classList.contains("open")) return;
  if (e.key === "Escape") closeInvitationPreview();
  else if (!e.target.closest(".inv-page") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) showInvitationPage(invPageNo + (e.key === "ArrowRight" ? 1 : -1));   // not while typing in a page
});
// Mouse wheel / trackpad scroll moves one page at a time. The page is fitted to the window, so there is normally nothing to
// scroll inside it; if the window is so small that it does scroll, the wheel scrolls it first and flips the page only at
// the edge. A trackpad fires a burst of events for one swipe, so after a flip further events are ignored until the burst
// has died down (no wheel event for 180 ms) and at least 350 ms have passed.
let invWheelLockUntil = 0, invWheelLastAt = 0;
$("inv-sheets").addEventListener("wheel", (e) => {
  e.preventDefault();   // stops the page behind the overlay moving
  const now = performance.now();
  const burstOver = now - invWheelLastAt > 180;
  invWheelLastAt = now;
  if (now < invWheelLockUntil && !burstOver) return;
  const box = $("inv-sheets"), dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  if (Math.abs(dy) < 4) return;
  const canScroll = box.scrollHeight > box.clientHeight + 2;
  if (canScroll && (dy > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 2 : box.scrollTop > 2)) { box.scrollTop += dy; return; }
  const before = invPageNo;
  showInvitationPage(invPageNo + (dy > 0 ? 1 : -1));
  if (invPageNo !== before) invWheelLockUntil = now + 350;
}, { passive: false });
window.addEventListener("resize", () => { if ($("inv-overlay").classList.contains("open")) invFitPage(); });
