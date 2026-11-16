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
  $("inv-sheets").scrollTop = $("inv-sheets").scrollLeft = 0;
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
// The zoom buttons and a two-finger pinch enlarge it from there (invZoomLevel times the fitted size, up to real size x 2); the box
// then scrolls. The level is any number from 1 (fitted) up: a pinch lands anywhere, the buttons step through INV_ZOOM_STEPS.
const INV_ZOOM_STEPS = [1, 1.5, 2, 3, 4];
let invZoomLevel = 1, invFit = 1;
const invMaxLevel = () => Math.max(1, Math.min(INV_ZOOM_STEPS[INV_ZOOM_STEPS.length - 1], Math.max(invFit, 2) / invFit));
function invFitPage() {
  const box = $("inv-sheets");
  invFit = Math.max(0.2, Math.min(1, (box.clientWidth - 24) / (INV.pageW * 96), (box.clientHeight - 28) / (INV.pageH * 96)));
  invZoomLevel = Math.min(Math.max(invZoomLevel, 1), invMaxLevel());
  document.documentElement.style.setProperty("--inv-zoom", String(invFit * invZoomLevel));
  $("inv-zoom-out").disabled = $("inv-zoom-fit").disabled = invZoomLevel < 1.001;
  $("inv-zoom-in").disabled = invZoomLevel > invMaxLevel() - 0.001;
}
// Zoom to `level`, keeping the spot at (px, py) (in the box's own window; default its middle) where it is on the screen.
function invSetZoom(level, px, py) {
  const box = $("inv-sheets");
  px ??= box.clientWidth / 2;
  py ??= box.clientHeight / 2;
  const fx = (box.scrollLeft + px) / box.scrollWidth, fy = (box.scrollTop + py) / box.scrollHeight;
  invZoomLevel = level;
  invFitPage();
  box.scrollLeft = fx * box.scrollWidth - px;
  box.scrollTop = fy * box.scrollHeight - py;
}
function invZoomBy(direction) {
  const next = direction > 0
    ? INV_ZOOM_STEPS.find((s) => s > invZoomLevel + 0.001) ?? invMaxLevel()
    : [...INV_ZOOM_STEPS].reverse().find((s) => s < invZoomLevel - 0.001) ?? 1;
  invSetZoom(next);
}

async function openInvitationPreview() {
  invEnsureBuilt();
  $("inv-overlay").classList.add("open");
  document.body.classList.add("inv-open");
  invZoomLevel = 1;
  setInvitationEditing(false);   // always opens as view-only
  $("inv-bar-close").focus();
  await invFitTitles();
}

// Edit mode. The pages are view-only until Edit is pressed; then the bottom banner offers Save (keep the changes) or Cancel
// (put the booklet back as it was when Edit was pressed). Print, Edit and Close are off meanwhile, so an edit session always
// ends with one of the two.
let invEditing = false, invSnapshot = "";
function setInvitationEditing(on) {
  invEditing = on;
  $("inv-overlay").classList.toggle("editing", on);
  document.querySelectorAll("#inv-sheets .inv-page").forEach((p) => { p.contentEditable = on ? "true" : "false"; });
  ["inv-bar-edit", "inv-bar-print", "inv-bar-close"].forEach((id) => { $(id).disabled = on; });
  invFitPage();   // the banner takes room from the page
}
function startInvitationEdit() {
  invSnapshot = $("inv-sheets").innerHTML;
  setInvitationEditing(true);
}
function cancelInvitationEdit() {
  $("inv-sheets").innerHTML = invSnapshot;
  invSnapshot = "";
  setInvitationEditing(false);
  showInvitationPage(invPageNo);   // the restored markup remembers the page it was on when Edit was pressed
}
function saveInvitationEdit() {
  invSnapshot = "";
  setInvitationEditing(false);
  window.getSelection().removeAllRanges();
}

function closeInvitationPreview() {
  $("inv-overlay").classList.remove("open");
  document.body.classList.remove("inv-open");
}

// Fonts load only once text is on screen, so the booklet is shown (print CSS) and the fonts are awaited before the
// print dialog opens; otherwise the first print could come out in a fallback font.
//
// Two ways to print, chosen in the Print chooser:
//  - "booklet": the sheets for the printer (two pages per 18 x 12 in sheet, in the printer's order), as usual;
//  - "share":   a PDF for WhatsApp: the pages one by one, in page order, 9 x 12 in each, with the Amman photo in colour;
//  - "festive": the same WhatsApp PDF in full colour (maroon and gold, invitation-festive.css).
//    The booklet's sheets are in printing order, so the pages are copied (edits included) in page order into #inv-share,
//    which only this print shows (invitation.css).
async function printInvitation(mode) {
  const festive = mode === "festive";
  const share = mode === "share" || festive;
  invEnsureBuilt();
  await invFitTitles();
  const originalTitle = document.title;
  document.title = `Invitation ${invFunctionLabel(invPickedFunction())}${share ? " WhatsApp" : ""}${festive ? " festive" : ""}`;   // the browser's default PDF file name
  const bodyClasses = ["inv-printing", ...(share ? ["inv-sharing"] : []), ...(festive ? ["inv-festive"] : [])];
  if (share) {
    const pages = [...$("inv-sheets").querySelectorAll(".inv-page")].sort((a, b) => Number(a.dataset.page) - Number(b.dataset.page));
    $("inv-share").replaceChildren(...pages.map((p) => { const copy = p.cloneNode(true); copy.contentEditable = "false"; return copy; }));
  }
  document.body.classList.add(...bodyClasses);
  await document.fonts.ready;
  await Promise.all([...$("inv-share").querySelectorAll("img")].map((img) => img.decode().catch(() => {})));   // the colour photo must be ready
  await new Promise((resolve) => requestAnimationFrame(resolve));
  window.addEventListener("afterprint", () => {
    document.body.classList.remove(...bodyClasses);
    $("inv-share").replaceChildren();
    document.title = originalTitle;
  }, { once: true });
  window.print();
}

const invChooseOpen = () => $("inv-choose").classList.contains("open");
function openPrintChooser() {
  $("inv-choose").classList.add("open");
  $("inv-print-booklet").focus();
}
const closePrintChooser = () => { $("inv-choose").classList.remove("open"); $("inv-bar-print").focus(); };
function printAs(mode) {
  $("inv-choose").classList.remove("open");
  printInvitation(mode);
}

$("inv-pills").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-fn]");
  if (!btn) return;
  invFunctionId = btn.dataset.fn;
  invBuiltFor = null;   // a fresh build for every pick
  renderInvitationCard();
});
$("inv-preview").addEventListener("click", openInvitationPreview);
$("inv-bar-edit").addEventListener("click", startInvitationEdit);
$("inv-edit-cancel").addEventListener("click", cancelInvitationEdit);
$("inv-edit-save").addEventListener("click", saveInvitationEdit);
$("inv-bar-print").addEventListener("click", openPrintChooser);
$("inv-print-booklet").addEventListener("click", () => printAs("booklet"));
$("inv-print-share").addEventListener("click", () => printAs("share"));
$("inv-print-festive").addEventListener("click", () => printAs("festive"));
$("inv-choose-cancel").addEventListener("click", closePrintChooser);
$("inv-choose").addEventListener("click", (e) => { if (e.target === $("inv-choose")) closePrintChooser(); });   // a click on the dark backdrop
$("inv-bar-close").addEventListener("click", closeInvitationPreview);
$("inv-zoom-out").addEventListener("click", () => invZoomBy(-1));
$("inv-zoom-in").addEventListener("click", () => invZoomBy(1));
$("inv-zoom-fit").addEventListener("click", () => { invZoomLevel = 1; invFitPage(); });
$("inv-prev").addEventListener("click", () => showInvitationPage(invPageNo - 1));
$("inv-next").addEventListener("click", () => showInvitationPage(invPageNo + 1));
document.addEventListener("keydown", (e) => {
  if (!$("inv-overlay").classList.contains("open")) return;
  if (e.key === "Escape") { if (invChooseOpen()) closePrintChooser(); else if (!invEditing) closeInvitationPreview(); }   // while editing, only Save / Cancel leave
  else if (!invChooseOpen() && !e.target.closest(".inv-page") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) showInvitationPage(invPageNo + (e.key === "ArrowRight" ? 1 : -1));   // not while typing in a page
});
// Mouse wheel / trackpad scroll moves one page at a time. The page is fitted to the window, so there is normally nothing to
// scroll inside it; if the window is so small that it does scroll, the wheel scrolls it first and flips the page only at
// the edge. A trackpad fires a burst of events for one swipe, so after a flip further events are ignored until the burst
// has died down (no wheel event for 180 ms) and at least 350 ms have passed.
let invWheelLockUntil = 0, invWheelLastAt = 0;
// Is there more of the page to scroll to in this direction? (Normally not: the page is fitted to the window.)
const invCanScrollFurther = (box, down) =>
  box.scrollHeight > box.clientHeight + 2 && (down ? box.scrollTop + box.clientHeight < box.scrollHeight - 2 : box.scrollTop > 2);
$("inv-sheets").addEventListener("wheel", (e) => {
  e.preventDefault();   // stops the page behind the overlay moving
  const now = performance.now();
  const burstOver = now - invWheelLastAt > 180;
  invWheelLastAt = now;
  if (now < invWheelLockUntil && !burstOver) return;
  const box = $("inv-sheets"), dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  if (Math.abs(dy) < 4) return;
  if (invCanScrollFurther(box, dy > 0)) { box.scrollTop += dy; return; }
  const before = invPageNo;
  showInvitationPage(invPageNo + (dy > 0 ? 1 : -1));
  if (invPageNo !== before) invWheelLockUntil = now + 350;
}, { passive: false });
// Touch: on a phone, swipe up = next page, swipe down = previous page (the touch twin of the wheel above). Only a clear, long,
// mostly vertical swipe with one finger counts (so pinch-zoom, taps and horizontal drags are left alone), and not while text is
// selected. Like the wheel, a page too big for the window scrolls first: a swipe that started with more to scroll that way does not flip.
let invTouch = null;
// Pinch: two fingers zoom the page like any phone (touch-action in invitation.css hands those touches to this code instead of
// the browser's own page zoom). The spot between the fingers stays under them. A pinch never counts as a page-flipping swipe.
let invPinch = null;
const invFingers = (e) => {
  const [a, b] = e.touches, r = $("inv-sheets").getBoundingClientRect();
  return { gap: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
};
$("inv-sheets").addEventListener("touchmove", (e) => {
  if (e.touches.length !== 2) { invPinch = null; return; }
  const f = invFingers(e);
  if (!invPinch) { invPinch = { gap: f.gap, level: invZoomLevel }; return; }
  e.preventDefault();
  invSetZoom(Math.min(Math.max(invPinch.level * (f.gap / invPinch.gap), 1), invMaxLevel()), f.x, f.y);
}, { passive: false });
$("inv-sheets").addEventListener("touchstart", (e) => {
  const box = $("inv-sheets"), t = e.touches[0];
  invPinch = null;
  invTouch = e.touches.length === 1 && window.getSelection().isCollapsed
    ? { x: t.clientX, y: t.clientY, canDown: invCanScrollFurther(box, true), canUp: invCanScrollFurther(box, false) }
    : null;
}, { passive: true });
$("inv-sheets").addEventListener("touchend", (e) => {
  const start = invTouch;
  invTouch = null;
  if (!start || e.touches.length) return;
  const t = e.changedTouches[0], dx = t.clientX - start.x, dy = start.y - t.clientY;   // dy > 0: the finger moved up
  if (Math.abs(dy) < 60 || Math.abs(dy) < 1.5 * Math.abs(dx)) return;
  if (dy > 0 ? start.canDown : start.canUp) return;
  showInvitationPage(invPageNo + (dy > 0 ? 1 : -1));
}, { passive: true });
window.addEventListener("resize", () => { if ($("inv-overlay").classList.contains("open")) invFitPage(); });
