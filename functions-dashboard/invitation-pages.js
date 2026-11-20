// The invitation booklet: builds every page as HTML from the loaded data (data.js) and the fixed wording
// (invitation-text.js), and lays the pages out on sheets the way the print shop's PDF did. invitation.js shows the result
// (preview) and prints it; invitation.css styles it. Sizes are in INCHES because the booklet is a physical print:
// a page is 9 x 12 in, two pages side by side make one 18 x 12 in sheet.
//
// Page order (the same as the printed booklet): 1 cover, 2 invitation letter, 3 donors + appeal, then the long lists
// (head-tax payers, donors) flowing over as many pages as they need, the gift-in-kind page, the expense list, and
// last the income/expense summary. Because the sheets are folded, the page count is rounded up to a multiple of 4
// with blank pages after the lists, and the sheets pair pages like the PDF: 12|1, 2|11, 10|3, 4|9, 8|5, 6|7.
//
// Row heights here must match the --rh each table gets (invitation.css), otherwise the page flow would count wrong.

const INV = {
  bodyH: 9.8,      // usable height inside a page's frame (the body is 9.91in tall, a little spare is kept)
  titleH: 0.62,    // a table's title box
  headH: 0.44,     // a table's heading row (two lines)
  totalH: 0.3,     // a total row
  gap: 0.2,        // space between two tables on one page
  tableGap: 0.16,  // the blank line between two family tables inside one list (invTable: the inv-gap row)
  rowBorder: 0.011,// a row's 1px border
  minRows: 3,      // a table is not started on a page that has room for fewer rows than this
  noteH: 1.7,      // the closing note under the expense list
  pageW: 9, pageH: 12,
};

const invYearText = (f) => `${f.year}-ம் ஆண்டு`;
const invAmount = (n) => (Number(n) > 0 ? money(n) : "-");   // an amount cell: "-" when there is nothing, like the printed booklet
const invByAmountDesc = (a, b) => b.amount - a.amount || (a.name || "").localeCompare(b.name || "");

// ---------- the data, as table rows ----------

// Returns { rows, gaps }: the rows [S.No., receipt, name, amount] and the set of row indexes where a NEW family table starts
// (not the first). The S.No. counts from 1 again in each table, like the printed booklet; a table's gap is drawn above its first row.
function invPayerRows(f) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const sorted = ledgerEntries
    .filter((e) => e.function_id === f.id && e.santha_checked && byId.has(e.person_id))
    .map((e) => ({ p: byId.get(e.person_id), receipt: e.receipt_no || "", amount: Number(e.santha) || Number(f.santha_amount) || 0 }))
    .sort((a, b) => compareMembers(a.p, b.p));
  const gaps = new Set();
  let n = 0;
  const rows = sorted.map((r, i) => {
    if (i > 0 && r.p.family_group !== sorted[i - 1].p.family_group) { gaps.add(i); n = 0; }
    return [++n, escapeHtml(r.receipt), invNameCell(r.p), money(r.amount)];
  });
  return { rows, gaps };
}

const invNameCell = (p) => `${escapeHtml(p.name || p.name_en || "")}${p.place ? ` <small>${escapeHtml(p.place)}</small>` : ""}`;

function invIncomeRows(f, kind) {
  return incomeEntries
    .filter((r) => r.function_id === f.id && r.kind === kind)
    .map((r) => ({ name: r.name || "", receipt: r.receipt_no || "", amount: Number(r.amount) || 0 }))
    .sort(invByAmountDesc);
}

function invDonorRows(f) {
  return invIncomeRows(f, "donation").map((r, i) => [i + 1, escapeHtml(r.receipt), escapeHtml(r.name), money(r.amount)]);
}

function invExpenseRows(f) {
  return expenseEntries
    .filter((r) => r.function_id === f.id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((r) => [escapeHtml(r.name), money(r.amount)]);
}

// ---------- flowing a long list over pages ----------
// `sections` are tables { title, head, cols, cls, rh, rows, total } (see the builders below). Returns
// [{ frags: [{ sec, start, end, last }], used }]: which rows of which table go on which page, and how much of the
// page that fills. A table continues on the next page with its title and heading repeated, like the printed booklet.

function invFlow(sections) {
  const pages = [{ frags: [], used: 0 }];
  const page = () => pages[pages.length - 1];
  sections.filter((s) => s.rows.length).forEach((sec) => {
    const rowH = sec.rh + INV.rowBorder;
    const headH = INV.titleH + (sec.head ? INV.headH : 0);
    let i = 0;
    while (i < sec.rows.length) {
      const gap = page().frags.length ? INV.gap : 0;
      if (page().used + gap + headH + INV.minRows * rowH > INV.bodyH && page().used > 0) pages.push({ frags: [], used: 0 });
      page().used += (page().frags.length ? INV.gap : 0) + headH;
      const start = i;
      while (i < sec.rows.length) {
        const reserve = i + 1 === sec.rows.length && sec.total ? INV.totalH : 0;   // the last row must leave room for the total
        const gapH = i > start && sec.gaps?.has(i) ? INV.tableGap : 0;   // the blank line above a new family table (never at the top of a page)
        if (i > start && page().used + gapH + rowH + reserve > INV.bodyH) break;
        page().used += gapH + rowH;
        i++;
      }
      const last = i >= sec.rows.length;
      if (last && sec.total) page().used += INV.totalH;
      page().frags.push({ sec, start, end: i, last });
      if (!last) pages.push({ frags: [], used: 0 });
    }
  });
  return pages.filter((p) => p.frags.length);
}

// ---------- HTML pieces ----------

const invCorners = (set) => (set === "top" ? ["tl", "tr"] : ["tl", "tr", "bl", "br"]).map((c) => `<img class="inv-corner inv-corner-${c}" src="invitation/corner.png" alt="" />`).join("");

// One page: the frame, an optional ornate corner set (ornate: true = four corners, "top" = the top two), the content, and the page number (the cover has none).
function invPage(no, inner, { ornate = false } = {}) {
  return `<section class="inv-page" data-page="${no}" contenteditable="false" spellcheck="false">
    <div class="inv-frame${ornate ? " inv-ornate" : ""}">${ornate ? invCorners(ornate) : ""}<div class="inv-body">${inner}</div>${no > 1 ? `<span class="inv-badge" contenteditable="false">${no}</span>` : ""}</div>
  </section>`;
}

const invTitle = (text) => `<div class="inv-title-wrap"><h2 class="inv-title">${text}</h2></div>`;

function invTable(sec, from, to, withTotal, blanks = 0) {
  const cols = `<colgroup>${sec.cols.map((w) => `<col style="width:${w}in">`).join("")}</colgroup>`;
  const head = sec.head ? `<thead><tr>${sec.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : "";
  const row = (cells) => `<tr>${cells.map((c, i) => `<td class="${sec.cls[i]}">${c}</td>`).join("")}</tr>`;
  // A blank line (inv-gap, borderless at the sides so the tables look separate) above the first row of each new family table,
  // except at the top of a page (from).
  const gap = `<tr class="inv-gap"><td colspan="${sec.cols.length}"></td></tr>`;
  const body = sec.rows.slice(from, to).map((r, i) => (sec.gaps?.has(from + i) && i > 0 ? gap : "") + row(r)).join("");
  const total = withTotal && sec.total ? `<tr class="inv-total"><td colspan="${sec.cols.length - 1}">${sec.total.label}</td><td class="amt">${sec.total.amount}</td></tr>` : "";
  const blank = row(sec.cls.map(() => "&nbsp;")).repeat(blanks);
  return `<table class="inv-t${sec.head ? " inv-tight" : ""}" style="--rh:${sec.rh}in;--fs:${sec.fs}pt">${cols}${head}<tbody>${body}${total}${blank}</tbody></table>`;
}

const invBlock = (frag, blanks = 0) =>
  `<div class="inv-blk">${invTitle(frag.sec.title)}${invTable(frag.sec, frag.start, frag.end, frag.last, blanks)}</div>`;

// ---------- the tables of the lists ----------

// Columns of a numbered list (number, receipt, name, amount) in a 7.3in wide table. The number, receipt and amount columns are
// only as wide as their header words; the amount column grows only if the total ("1,74,455") needs more, and the name
// column gets all the rest.
function invListCols(total) {
  const amt = Math.max(0.63, +(0.07 * money(total).length + 0.05).toFixed(2));
  return [0.42, 0.57, +(7.3 - 0.42 - 0.57 - amt).toFixed(2), amt];
}

function invPayerSection(f) {
  const { rows, gaps } = invPayerRows(f);
  const sum = rows.reduce((t, r) => t + parseMoney(r[3]), 0);
  return { title: `${invYearText(f)} ${escapeHtml(f.name)} தலைக்கட்டு வரி செலுத்தியவர்கள்`, head: ["வ.<br>எண்", "இரசீது<br>எண்", "பெயர்", "தொகை"],
    cols: invListCols(sum), cls: ["n", "r", "name", "amt"], rh: 0.26, fs: 10.5, rows, gaps, total: { label: "மொத்தம்", amount: money(sum) } };
}

function invDonorSection(f) {
  const rows = invDonorRows(f);
  const sum = rows.reduce((t, r) => t + parseMoney(r[3]), 0);
  return { title: `${invYearText(f)} ${escapeHtml(f.name)} நன்கொடை வழங்கியவர்கள்`, head: ["வ.<br>எண்", "இரசீது<br>எண்", "பெயர்", "தொகை"],
    cols: invListCols(sum), cls: ["n", "r", "name", "amt"], rh: 0.2, fs: 9, rows, total: { label: "மொத்தம்", amount: money(sum) } };
}

function invExpenseSection(f) {
  const rows = invExpenseRows(f);
  const sum = rows.reduce((t, r) => t + parseMoney(r[1]), 0);
  return { title: `${invYearText(f)} ${escapeHtml(f.name)} செலவினங்கள்`, head: null, cols: [6.5, 0.8], cls: ["name", "amt"], rh: 0.2, fs: 9.5, rows,
    total: { label: "மொத்த செலவுகள்", amount: money(sum) } };
}

// ---------- the fixed-layout pages (the cover and the letter are in invitation-cover.js) ----------

function invDonorsPage(no, f) {   // page 3
  const rows = invIncomeRows(f, "thirupani");
  const total = rows.reduce((t, r) => t + r.amount, 0);
  const rh = Math.max(0.17, Math.min(0.27, 3.5 / Math.max(rows.length, 1)));
  const list = rows.map((r) => `<tr><td class="name">${escapeHtml(r.name)}</td><td class="amt">${money(r.amount)}/-</td></tr>`).join("");
  const contacts = INV_TEXT.contacts.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td></tr>`).join("");
  return invPage(no, `
    ${invTitle(INV_TEXT.annadhanamTitle)}
    <div class="inv-center">${INV_TEXT.annadhanamLines.map((l) => `<p>${l}</p>`).join("")}</div>
    <hr class="inv-rule" />
    ${invTitle(INV_TEXT.thirupaniTitle)}
    <table class="inv-t inv-plain" style="--rh:${rh}in;--fs:10.5pt"><colgroup><col><col style="width:1.2in"></colgroup><tbody>${list}</tbody></table>
    <p class="inv-total-line"><span>மொத்தம்</span><b>${money(total)}/-</b></p>
    <div class="inv-appeal">${INV_TEXT.appeal.map((l) => `<p>${l}</p>`).join("")}</div>
    <p class="inv-signoff">${INV_TEXT.signoff}</p>
    <table class="inv-contacts"><tbody>${contacts}</tbody></table>`, { ornate: true });
}

// Page 10: gifts in kind. Nothing in the database for it: the rows come from INV_TEXT.gifts for the year (typed in from the
// printed booklet), and a year with none prints a blank table to type into (the pages can be edited in the preview).
function invGiftsPage(no, f) {
  const title = `${invYearText(f)} ${escapeHtml(f.name)}விற்கு அன்பளிப்பு வழங்கியவர்கள்`;
  const cell = (text) => escapeHtml(text).replace(/\n/g, "<br>") || "&nbsp;";
  const gifts = INV_TEXT.gifts[f.year] ?? Array(22).fill(["", ""]);
  const rows = gifts.map(([item, who]) => `<tr><td class="item">${cell(item)}</td><td class="who">${cell(who)}</td></tr>`).join("");
  return invPage(no, `${invTitle(title)}<table class="inv-gifts"><colgroup><col style="width:2.3in"><col></colgroup><tbody>${rows}</tbody></table>`);
}

function invSummaryPage(no, f) {   // page 12
  const s = summarize(new Set([f.id]));
  const x = s.income.extra;
  const y = invYearText(f);
  const incomeRows = [
    [`${y} திருவிழா கையிருப்பு`, x["carry-forward"]],
    ["உண்டியல் வரவு", x.hundi],
    ["கோயில்திருப்பணி பெயிண்டிங் நன்கொடை வரவு", x.thirupani],
    [`${y} பௌர்ணமி பூஜை, கோவில் பராமரிப்பு மற்றும் முடி காணிக்கை வரவுகள்`, x.pournami],
    [`${y} தலைக்கட்டு வரி ரசீது படி வரவு`, s.income.santha],
    [`${y} திருவிழாவிற்கு நன்கொடை ரசீது படி வரவு`, x.donation],
    [`${y} திருவிழாவில் பௌர்ணமி பூஜை, காது குத்துதல் மற்றும் முடி காணிக்கை இரசீது படி வரவுகள்`, 0],
  ];
  const totalIncome = incomeRows.reduce((t, r) => t + (Number(r[1]) || 0), 0);
  const tr = (label, amount, cls = "") => `<tr class="${cls}"><td class="name">${label}</td><td class="amt">${invAmount(amount)}</td></tr>`;
  const table = (rows) => `<table class="inv-sum"><colgroup><col><col style="width:1.45in"></colgroup><tbody>${rows}</tbody></table>`;
  const requests = INV_TEXT.requests.map(([n, text]) => `<p><span>${n}</span>${text}</p>`).join("");
  return invPage(no, `
    ${invTitle(`${y} மொத்த வரவுகள் விபரம்`)}
    ${table(incomeRows.map(([l, a]) => tr(l, a)).join("") + tr("மொத்த வரவுகள்", totalIncome, "ctr"))}
    <h3 class="inv-sub">${y} கோவில் பௌர்ணமி பூஜை மற்றும் பராமரிப்பு செலவுகள்</h3>
    ${table(tr(`${y} ${escapeHtml(f.name)} செலவினங்கள்`, s.expense) + tr("ஐயர் சம்பளம் + போனஸ் உட்பட", 0) + tr("தூய்மை பணியாளர் சம்பளம் + போனஸ் உட்பட", 0) +
      tr("அபிஷேக பொருட்கள் + பராமரிப்பு செலவுகள் மாலைகள் மற்றும் பூக்கள் + அன்னதானம்", 0) + tr("மொத்தம்", s.expense, "ctr"))}
    ${table(tr(`${y} ${escapeHtml(f.name)} தலைக்கட்டு வரி, நன்கொடை மற்றும் முடி காணிக்கை, பௌர்ணமி பூஜை, கோவில் பராமரிப்பு மொத்த வரவுகள்`, totalIncome) +
      tr(`${y}ன் ${escapeHtml(f.name)}, பௌர்ணமி பூஜை கோயில் பராமரிப்பு மொத்த செலவினங்கள்`, s.expense) +
      tr(`${y} டிசம்பர் மாத மொத்த கையிருப்பு`, totalIncome - s.expense, "ctr"))}
    <hr class="inv-rule" />
    <h3 class="inv-request-title">${INV_TEXT.requestsTitle}</h3>
    <div class="inv-requests">${requests}</div>`, { ornate: true });
}

// ---------- the whole booklet ----------

// Page numbers on a sheet. n pages (a multiple of 4): sheet k front = [n-2k, 1+2k], back = [2+2k, n-1-2k].
function invImpose(n) {
  const sheets = [];
  for (let k = 0; k < n / 4; k++) {
    sheets.push({ label: `Sheet ${k + 1}, front`, pages: [n - 2 * k, 1 + 2 * k] });
    sheets.push({ label: `Sheet ${k + 1}, back`, pages: [2 + 2 * k, n - 1 - 2 * k] });
  }
  return sheets;
}

// Returns { sheets: html, pageCount }. `f` is the function (accounts year) the booklet is about.
function buildInvitation(f) {
  const blocks = [];   // page builders (no) => html, in booklet order
  blocks.push((no) => invCoverPage(no, f));
  blocks.push((no) => invLetterPage(no, f));
  blocks.push((no) => invDonorsPage(no, f));
  invFlow([invPayerSection(f), invDonorSection(f)]).forEach((p) =>
    blocks.push((no) => invPage(no, p.frags.map((frag) => invBlock(frag)).join(""))));
  const listEnd = blocks.length;
  blocks.push((no) => invGiftsPage(no, f));
  const expenseSec = invExpenseSection(f);
  let expensePages = invFlow([expenseSec]);
  if (!expensePages.length) expensePages = [{ frags: [{ sec: expenseSec, start: 0, end: 0, last: true }], used: INV.titleH + INV.totalH }];   // no lines yet: still an (empty) page
  expensePages.forEach((p, i, all) => {
    blocks.push((no) => {
      const last = i === all.length - 1;
      const frag = p.frags[0];
      // The last expense page is filled up with empty ruled rows, then the closing note, like the printed page.
      const room = INV.bodyH - p.used - (last ? INV.noteH : 0);
      const blanks = Math.max(0, Math.floor(room / (frag.sec.rh + INV.rowBorder)));
      const note = last ? `<div class="inv-note"><p>${INV_TEXT.annadhanamCall(f.year)}</p></div>` : "";
      return invPage(no, `${invBlock(frag, blanks)}${note}`);
    });
  });
  blocks.push((no) => invSummaryPage(no, f));

  const pad = (4 - (blocks.length % 4)) % 4;   // blank pages so the folded sheets work out
  blocks.splice(listEnd, 0, ...Array.from({ length: pad }, () => (no) => invPage(no, "")));

  const pages = blocks.map((make, i) => make(i + 1));
  const sheets = invImpose(pages.length).map((s) =>
    `<div class="inv-sheet-wrap"><div class="inv-sheet">${s.pages.map((n) => pages[n - 1]).join("")}</div></div>`);
  return { sheets: sheets.join(""), pageCount: pages.length };
}
