// The "Send receipt" box. Ticking a member's தலைக்கட்டு வரி box (app.js) opens it; nothing is sent by itself, so a mis-tap
// never messages anybody. The receipt is a picture (receipt-image.js), shown here as a preview, and from the box the clerk can:
//   - WhatsApp: sends the PICTURE only, no text. A phone/tablet opens its share sheet (pick WhatsApp, then the member);
//     a laptop copies the picture and opens that member's WhatsApp chat: click the message box, Ctrl+V, Send.
//     (A WhatsApp link can never attach a picture by itself; this is the closest a web page can get without a paid backend.)
//   - Save image: downloads the PNG.
//   - Print receipt: the browser's print dialog, printing that same picture on an A5 page.
//   - SMS: opens the messages app with a short text (a laptop has no SMS app).
// Loaded BEFORE app.js, after receipt-image.js. It reads app.js globals (functionsList, selectedFunctionId) only when a tick
// happens, never at load. Needs formatMoney (money-format.js). Styles: receipt.css.

// What the receipt is about, read from the ticked row.
function receiptDetails(tr) {
  const f = functionsList.find((fn) => fn.id === selectedFunctionId);
  return {
    name: tr.querySelector(".f-name").value,
    place: tr.querySelector(".f-place").value,
    mobile: tr.querySelector(".f-mobile").value.replace(/\s+/g, ""),
    amount: Number(tr.querySelector(".f-santha-check").dataset.amount),
    receipt: tr.querySelector(".f-receipt").value.trim(),
    festival: f ? `${f.name} (${f.year})` : "",
    date: new Date().toLocaleDateString("en-GB"),   // 16/11/2026
  };
}

// 98765 43210 or 098765... or +91... all become 919876543210 (digits only, with the country code), "" if it cannot be a number.
function receiptPhone(raw) {
  const digits = String(raw).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 ? digits : "";
}

// Tamil letters take more room in an SMS (70 characters each), so the SMS is short.
const receiptSms = (d) =>
  `ஸ்ரீ வீரமாத்தி அம்மன் துணை. ${d.name}, தலைக்கட்டு வரி ரூ.${formatMoney(d.amount)} பெற்றோம்.${d.receipt ? ` இரசீது எண் ${d.receipt}.` : ""} நன்றி.`;

// ---------- the box ----------
let receiptBox = null, receiptRow = null, receiptData = null;
let receiptBlobPromise = null, receiptImgUrl = "";   // the picture for the details in the box right now

const receiptEl = (id) => receiptBox.querySelector(`#${id}`);
const receiptFileName = () => `receipt-${(receiptData.receipt || receiptData.name).replace(/[^\w\u0B80-\u0BFF-]+/g, "_")}.png`;
const setReceiptStatus = (text, isError = false) => {
  const el = receiptEl("receipt-status");
  el.textContent = text;
  el.classList.toggle("error", isError);
};

// Draws the picture again for the current details (on open, and each time the receipt number changes).
function refreshReceiptImage() {
  const mine = receiptBlobPromise = renderReceiptBlob(receiptData);
  mine.then((blob) => {
    if (mine !== receiptBlobPromise) return;   // a newer picture is already on its way
    if (receiptImgUrl) URL.revokeObjectURL(receiptImgUrl);
    receiptImgUrl = URL.createObjectURL(blob);
    receiptEl("receipt-img").src = receiptImgUrl;
  }).catch((err) => { if (mine === receiptBlobPromise) setReceiptStatus(err.message, true); });
}

// Phone/tablet: the share sheet. Laptop: copy the picture and open the member's chat. Either way the clerk presses Send.
async function sendReceiptOnWhatsApp() {
  const blob = await receiptBlobPromise;
  const file = new File([blob], receiptFileName(), { type: "image/png" });
  const touchDevice = window.matchMedia("(pointer: coarse)").matches;
  if (touchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;   // the clerk closed the share sheet: nothing went wrong
    }
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setReceiptStatus("Receipt picture copied. In the WhatsApp chat that just opened, click the message box, press Ctrl+V (Cmd+V on a Mac), then Send.");
  } catch {
    saveReceiptImage();   // this browser will not let a page copy a picture: save it so it can be attached with the clip icon
    setReceiptStatus("Could not copy the picture, so it was saved instead. In the WhatsApp chat that just opened, attach it with the clip icon, then Send.");
  }
  // (not the "noopener" option: it makes window.open always return null, which looks exactly like a blocked pop-up)
  const tab = window.open(`https://wa.me/${receiptPhone(receiptData.mobile)}`, "_blank");
  if (tab) tab.opener = null;
  else setReceiptStatus("The browser blocked the WhatsApp tab. Allow pop-ups for this site, then press WhatsApp again.", true);
}

function saveReceiptImage() {
  const a = document.createElement("a");
  a.href = receiptImgUrl;
  a.download = receiptFileName();
  a.click();
}

// The picture itself goes in the print-only block, on its own A5 page; the browser's dialog also has "Save as PDF".
async function printReceipt() {
  await receiptBlobPromise;
  document.getElementById("print-sheet").innerHTML = `<div class="print-receipt"><img src="${receiptImgUrl}" alt="Receipt" /></div>`;
  await document.querySelector("#print-sheet img").decode();
  const originalTitle = document.title;
  document.title = `Receipt ${receiptData.receipt || ""} - ${receiptData.name}`.trim();
  window.addEventListener("afterprint", () => { document.title = originalTitle; }, { once: true });
  window.print();
}

function buildReceiptBox() {
  receiptBox = document.createElement("div");
  receiptBox.className = "receipt-box hidden";
  receiptBox.innerHTML = `
    <div class="receipt-card" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <h3 id="receipt-title"></h3>
      <p class="receipt-sub" id="receipt-sub"></p>
      <label class="receipt-field">இரசீது எண் <input type="text" id="receipt-no" inputmode="numeric" /></label>
      <div class="receipt-preview"><img id="receipt-img" alt="Receipt preview" /></div>
      <p class="receipt-status" id="receipt-status" role="status" aria-live="polite"></p>
      <div class="receipt-actions">
        <button type="button" id="receipt-wa" class="receipt-wa">WhatsApp</button>
        <button type="button" id="receipt-print">Print receipt</button>
        <button type="button" id="receipt-save" class="secondary">Save image</button>
        <button type="button" id="receipt-sms" class="secondary">SMS</button>
        <button type="button" id="receipt-close" class="secondary">Not now</button>
      </div>
      <p class="receipt-note">Nothing is sent from here by itself: WhatsApp and SMS open with everything ready, and you press Send.</p>
    </div>`;
  document.body.appendChild(receiptBox);

  receiptEl("receipt-close").addEventListener("click", closeReceiptBox);
  receiptBox.addEventListener("mousedown", (e) => { if (e.target === receiptBox) closeReceiptBox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !receiptBox.classList.contains("hidden")) closeReceiptBox(); });

  // Typing the receipt number here fills it into the sheet row too (which saves it), and draws the picture again.
  receiptEl("receipt-no").addEventListener("input", (e) => {
    receiptData.receipt = e.target.value.trim();
    const sheetInput = receiptRow.querySelector(".f-receipt");
    sheetInput.value = receiptData.receipt;
    sheetInput.dispatchEvent(new Event("input", { bubbles: true }));
    refreshReceiptImage();
  });
  receiptEl("receipt-wa").addEventListener("click", sendReceiptOnWhatsApp);
  receiptEl("receipt-print").addEventListener("click", printReceipt);
  receiptEl("receipt-save").addEventListener("click", saveReceiptImage);
  receiptEl("receipt-sms").addEventListener("click", () => {
    window.location.href = `sms:+${receiptPhone(receiptData.mobile)}?&body=${encodeURIComponent(receiptSms(receiptData))}`;
  });
}

function openReceiptBox(tr) {
  if (!receiptBox) buildReceiptBox();
  receiptRow = tr;
  receiptData = receiptDetails(tr);
  const phone = receiptPhone(receiptData.mobile);
  receiptEl("receipt-title").textContent = receiptData.name;
  receiptEl("receipt-sub").textContent = `${receiptData.place ? `${receiptData.place} · ` : ""}${receiptData.mobile || "no mobile number"} · தலைக்கட்டு வரி ரூ.${formatMoney(receiptData.amount)}`;
  receiptEl("receipt-no").value = receiptData.receipt;
  receiptEl("receipt-img").removeAttribute("src");
  receiptEl("receipt-wa").disabled = receiptEl("receipt-sms").disabled = !phone;
  setReceiptStatus(phone ? "" : "This member has no usable mobile number, so only Print and Save image are available.", !phone);
  receiptBox.classList.remove("hidden");
  refreshReceiptImage();
  (phone ? receiptEl("receipt-wa") : receiptEl("receipt-print")).focus();
}

function closeReceiptBox() {
  receiptBox.classList.add("hidden");
  receiptRow = receiptData = receiptBlobPromise = null;
}
