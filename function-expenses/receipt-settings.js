// Receipt numbering. The pill after the செலவு tab (a round gear and "Next 107"; app.js puts it there) asks for the number to start from (kept in this browser only, like a
// bookmark); after that, ticking a member's தலைக்கட்டு வரி box (app.js) fills the next number into their இரசீது எண்
// when it is still empty. Un-ticking or re-ticking a row that already has a number never uses up another one.
// It also holds the "Receipt folder" row: where receipt pictures are saved (receipt-folder.js). Uses the .receipt-box / .receipt-card look from receipt.css.

const RECEIPT_NEXT_KEY = "veeramathi.nextReceiptNo";

const nextReceiptNumber = () => {
  const n = parseInt(localStorage.getItem(RECEIPT_NEXT_KEY), 10);
  return n > 0 ? n : 0;   // 0 = not set up
};

// The pill after the செலவு tab: a round gear and "Next 107" (or "Next -" while not set up). The title is redrawn often,
// so app.js asks for the HTML each time and every change below refreshes whatever labels are on screen.
const GEAR_ICON = `<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#fff"/><g transform="translate(4.2 4.2) scale(0.65)" fill="none" stroke="#9a3412" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g></svg>`;
const nextReceiptLabel = () => `Next ${nextReceiptNumber() || "-"}`;
const settingsPillHtml = () =>
  `<button type="button" class="members-toggle settings-pill" aria-label="Receipt settings" title="Receipt settings">${GEAR_ICON}<span class="settings-next">${nextReceiptLabel()}</span></button>`;

// The one place the counter is written (0 = turn off), so the label can never go stale.
function setNextReceiptNumber(n) {
  if (n > 0) localStorage.setItem(RECEIPT_NEXT_KEY, String(n)); else localStorage.removeItem(RECEIPT_NEXT_KEY);
  document.querySelectorAll(".settings-next").forEach((el) => { el.textContent = nextReceiptLabel(); });
}

// Hands out the next number (as text) and moves the counter on; "" when no starting number was set.
function takeReceiptNumber() {
  const n = nextReceiptNumber();
  if (!n) return "";
  setNextReceiptNumber(n + 1);
  return String(n);
}

let settingsBox = null;

function buildSettingsBox() {
  settingsBox = document.createElement("div");
  settingsBox.className = "receipt-box hidden";
  settingsBox.innerHTML = `
    <form class="receipt-card" role="dialog" aria-modal="true" aria-labelledby="rs-title">
      <h3 id="rs-title">Receipt settings</h3>
      <p class="receipt-sub">Type the number the next receipt should have. After that, each time you tick a member's தலைக்கட்டு வரி box, the next number is filled into their இரசீது எண் (if it is empty).</p>
      <label class="receipt-field">தொடக்க இரசீது எண் <input type="text" id="rs-start" inputmode="numeric" autocomplete="off" /></label>
      <div class="receipt-folder" id="rs-folder-row">
        <span id="rs-folder-label"></span>
        <button type="button" id="rs-folder" class="secondary">Choose folder</button>
      </div>
      <p class="receipt-status" id="rs-status" role="status" aria-live="polite"></p>
      <div class="receipt-actions">
        <button type="submit" id="rs-save">Save</button>
        <button type="button" id="rs-off" class="secondary">Turn off</button>
        <button type="button" id="rs-close" class="secondary">Cancel</button>
      </div>
      <p class="receipt-note">Saved on this phone / computer only. On another device, set these there too.</p>
    </form>`;
  document.body.appendChild(settingsBox);

  const field = settingsBox.querySelector("#rs-start");
  const status = settingsBox.querySelector("#rs-status");
  const close = () => settingsBox.classList.add("hidden");
  settingsBox.querySelector("#rs-close").addEventListener("click", close);
  settingsBox.addEventListener("mousedown", (e) => { if (e.target === settingsBox) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !settingsBox.classList.contains("hidden")) close(); });
  settingsBox.querySelector("#rs-folder").addEventListener("click", async () => {
    try { await chooseReceiptFolder(); } catch (err) { if (err.name !== "AbortError") { status.textContent = `Could not choose that folder (${err.message}). Try a folder inside Downloads, like Receipt.`; status.classList.add("error"); } }
    showFolder();
  });
  settingsBox.querySelector("#rs-off").addEventListener("click", () => { setNextReceiptNumber(0); close(); });
  settingsBox.firstElementChild.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = /^\d+$/.test(field.value.trim()) ? parseInt(field.value, 10) : 0;
    if (!n) {
      status.textContent = "Please type a number, like 101.";
      status.classList.add("error");
      return field.focus();
    }
    setNextReceiptNumber(n);
    close();
  });
}

// The "Receipt folder" row: what is chosen now, or why there is nothing to choose.
async function showFolder() {
  const label = settingsBox.querySelector("#rs-folder-label");
  const button = settingsBox.querySelector("#rs-folder");
  button.hidden = !receiptFolderSupported();
  if (!receiptFolderSupported()) {
    label.textContent = "Receipt pictures go to your normal Downloads folder. Saving into a Receipt folder works on a laptop with Chrome or Edge.";
    return;
  }
  const folder = await getReceiptFolder();
  label.textContent = folder ? `Receipt pictures are saved in the "${folder.name}" folder.` : "Pictures go to your normal Downloads. Make a folder named Receipt inside Downloads, then choose it.";
  button.textContent = folder ? "Change folder" : "Choose folder";
}

function openReceiptSettings() {
  if (!settingsBox) buildSettingsBox();
  const current = nextReceiptNumber();
  const status = settingsBox.querySelector("#rs-status");
  status.textContent = current ? `The next receipt will be number ${current}.` : "Not set up yet: receipt numbers are typed by hand.";
  status.classList.remove("error");
  const field = settingsBox.querySelector("#rs-start");
  field.value = current || "";
  settingsBox.classList.remove("hidden");
  showFolder();
  field.focus();
  field.select();
}

// One listener for the whole page: the pill is redrawn with the title, so a listener on the button itself would be lost.
document.addEventListener("click", (e) => { if (e.target.closest(".settings-pill")) openReceiptSettings(); });
