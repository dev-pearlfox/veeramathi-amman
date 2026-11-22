// Draws the receipt as ONE picture (a PNG). The same picture is shown in the Send box, shared to WhatsApp, saved, and printed,
// so what is printed is exactly what the member receives. Used by receipt.js; needs formatMoney (money-format.js).
// Drawn on a <canvas> with the site fonts (Noto Sans Tamil / Poppins from the Google Fonts link in index.html).

const RECEIPT_W = 1080, RECEIPT_MIN_H = 1480;   // 1080 wide is WhatsApp's sweet spot; 1080x1480 is close to an A5 page. A long name makes it taller.
const ROW_H = 66, ROW_EXTRA_LINE_H = 42;   // one detail row, and what a second line of a long value adds
const RECEIPT_FONT = '"Noto Sans Tamil", Poppins, sans-serif';
const RECEIPT_COLOURS = { cream: "#fff8f1", ink: "#2a1a10", muted: "#8a6f5c", line: "#f2ddc7", orange: "#ea580c", red: "#dc2626" };

let receiptArtPromise = null;
function loadReceiptArt() {
  receiptArtPromise ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { receiptArtPromise = null; reject(new Error("Could not load the Amma picture.")); };
    img.src = RECEIPT_ART_DATA_URL;   // receipt-art.js
  });
  return receiptArtPromise;
}

// Canvas text needs the web fonts to be loaded already, or it silently draws in a fallback font.
const loadReceiptFonts = () => Promise.all([
  document.fonts.load(`800 40px ${RECEIPT_FONT}`, "ஸ்ரீ வீரமாத்தி"),
  document.fonts.load(`700 40px ${RECEIPT_FONT}`, "இரசீது"),
  document.fonts.load("800 40px Poppins", "Rs. 0123456789"),
]);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Draws `text` at (x, y); shrinks the font until it fits in maxW, so a long name never runs off the picture.
function fitText(ctx, text, x, y, maxW, weight, startPx) {
  let px = startPx;
  do { ctx.font = `${weight} ${px}px ${RECEIPT_FONT}`; px -= 2; } while (ctx.measureText(text).width > maxW && px > 18);
  ctx.fillText(text, x, y);
}

// A value that fits on one line stays big. A long one (a name with two people in it) is split into two lines at the best space,
// and only shrunk if even that does not fit. Returns { lines, px }.
function valueLines(ctx, text, maxW) {
  const width = (t, px) => { ctx.font = `700 ${px}px ${RECEIPT_FONT}`; return ctx.measureText(t).width; };
  if (width(text, 38) <= maxW) return { lines: [text], px: 38 };
  const words = text.split(" ");
  for (let px = 36; px >= 24; px -= 2) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
      const widest = Math.max(width(pair[0], px), width(pair[1], px));
      if (!best || widest < best.widest) best = { pair, widest };
    }
    if (best && best.widest <= maxW) return { lines: best.pair, px };
  }
  return { lines: [text], px: 24 };   // one very long word: fitText shrinks it
}

function drawReceipt(ctx, d, art, rows, height) {
  const C = RECEIPT_COLOURS, W = RECEIPT_W;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = C.cream;
  roundRect(ctx, 20, 20, W - 40, height - 40, 36); ctx.fill();
  ctx.strokeStyle = C.orange; ctx.lineWidth = 6; ctx.stroke();

  // header band
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, C.orange); band.addColorStop(1, C.red);
  ctx.save();
  roundRect(ctx, 23, 23, W - 46, 190, [33, 33, 0, 0]); ctx.clip();
  ctx.fillStyle = band; ctx.fillRect(0, 0, W, 220);
  ctx.restore();
  ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  fitText(ctx, "ஸ்ரீ வீரமாத்தி அம்மன் துணை", W / 2, 120, W - 120, 800, 66);
  ctx.fillStyle = "#ffe8d4";
  fitText(ctx, "குலதெய்வ வழிபாடு ! குலத்திற்கே மேம்பாடு !!", W / 2, 172, W - 140, 700, 32);

  // Amma
  const panelW = 440, panelH = 520, panelX = (W - panelW) / 2, panelY = 244;
  ctx.fillStyle = "#fff"; roundRect(ctx, panelX, panelY, panelW, panelH, 28); ctx.fill();
  ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
  const artH = panelH - 30, artW = artH * (art.naturalWidth / art.naturalHeight);
  ctx.drawImage(art, (W - artW) / 2, panelY + 15, artW, artH);

  // title and the rows
  ctx.fillStyle = C.ink;
  fitText(ctx, "இரசீது / Receipt", W / 2, 840, W - 160, 800, 46);
  ctx.strokeStyle = C.orange; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(W / 2 - 90, 864); ctx.lineTo(W / 2 + 90, 864); ctx.stroke();

  ctx.textAlign = "left";
  let rowY = 934;
  rows.forEach(({ label, lines, px }) => {
    ctx.fillStyle = C.muted; fitText(ctx, label, 90, rowY, 270, 700, 34);
    ctx.fillStyle = C.ink;
    lines.forEach((line, n) => fitText(ctx, line, 390, rowY + n * ROW_EXTRA_LINE_H, W - 390 - 90, 700, px));
    const lineY = rowY + (lines.length - 1) * ROW_EXTRA_LINE_H + 24;
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(90, lineY); ctx.lineTo(W - 90, lineY); ctx.stroke();
    rowY += ROW_H + (lines.length - 1) * ROW_EXTRA_LINE_H;
  });

  // the amount, under the last row (and never higher than the usual spot)
  const boxY = height - 240, boxH = 120;
  ctx.fillStyle = band; roundRect(ctx, 70, boxY, W - 140, boxH, 28); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "left";
  fitText(ctx, "தலைக்கட்டு வரி", 110, boxY + 74, 360, 800, 40);
  ctx.textAlign = "right"; ctx.font = `800 62px Poppins, sans-serif`;
  ctx.fillText(`Rs. ${formatMoney(d.amount)}`, W - 110, boxY + 82);

  ctx.textAlign = "center"; ctx.fillStyle = C.muted;
  fitText(ctx, "தங்கள் ஆதரவிற்கு மனமார்ந்த நன்றி.", W / 2, height - 60, W - 140, 700, 34);
}

// d: the details from receipt.js (name, place, festival, amount, receipt, date). Resolves to a PNG Blob.
async function renderReceiptBlob(d) {
  const [art] = await Promise.all([loadReceiptArt(), loadReceiptFonts()]);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const rows = [["இரசீது எண்", d.receipt], ["தேதி", d.date], ["பெயர்", d.name], ["Home Address", d.place], ["விழா", d.festival]]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, ...valueLines(ctx, value, RECEIPT_W - 390 - 90) }));
  const rowsEnd = 934 - ROW_H + 24 + rows.reduce((sum, r) => sum + ROW_H + (r.lines.length - 1) * ROW_EXTRA_LINE_H, 0);
  const height = Math.max(RECEIPT_MIN_H, rowsEnd + 36 + 240);   // rows, a gap, the amount box and the thank-you line
  canvas.width = RECEIPT_W; canvas.height = height;   // (resizing clears the canvas, so draw after it)
  drawReceipt(ctx, d, art, rows, height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the receipt."))), "image/png"));
}
