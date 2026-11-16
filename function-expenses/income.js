// The typed-lines tables of the accounts page: the extra வரவு tables (INCOME_KINDS, from ../income-categories.js:
// நன்கொடை, ஏலம், முந்தைய இருப்பு) and the செலவு table (EXPENSE_KIND, from ../expense-lines.js). Clicking one of
// their buttons shows a table of rows for the selected function, instead of the members sheet. These are lists the
// user adds to, so each row has its own id; rows are created in the browser and saved (debounced upsert) once they
// have something in them. Every kind picks its own columns. Income kinds share the income_entries table, told apart
// by income_entries.kind; செலவு has its own table (its `table`), so it has no kind. The names say "income" for
// historical reasons; it is one engine for all of them.
//
// Loaded BEFORE app.js: app.js calls incomeButtonsHtml()/expenseButtonHtml()/syncIncomeView() from updateSheetTitle().
// This file uses app.js globals (client, selectedFunctionId, setStatus, applySheetVisibility) only when its
// functions run, never at load time. Do not redeclare any global.

let incomeView = null;         // key of the kind on screen (null = none; the members sheet or செலவு shows instead)
let incomeRows = [];           // [{ id, date, name, nameEn, phone, amount, note, saved }] for incomeLoadedFor
let incomeLoadedFor = null;    // "functionId|kind" the rows above belong to
const incomeSaveTimers = {};   // row id -> { timer, row, funcId, kind }: the debounced save still waiting

// What each column `field` (see income-categories.js) is: its input, its income_entries column, and how to read it.
const FIELD_TYPES = {
  date:   { type: "date",   db: "received_on", read: (v) => v,                      fromDb: (v) => v || "",           toDb: (v) => v || null },
  name:   { type: "text",   db: "name",        read: (v) => v.trim(),               fromDb: (v) => v,                  toDb: (v) => v },
  nameEn: { type: "text",   db: "name_en",     read: (v) => v.trim(),               fromDb: (v) => v,                  toDb: (v) => v },
  phone:  { type: "text",   db: "phone",       read: (v) => v.trim(),               fromDb: (v) => v,                  toDb: (v) => v, mode: "numeric" },
  amount: { type: "text",   db: "amount",      read: parseMoney,                   fromDb: (v) => Number(v),          toDb: (v) => v, mode: "numeric" },
  note:   { type: "text",   db: "note",        read: (v) => v.trim(),               fromDb: (v) => v || "",            toDb: (v) => v },
};
const INCOME_FIELDS = Object.keys(FIELD_TYPES);

const LINE_KINDS = [...INCOME_KINDS, EXPENSE_KIND];                // every table this engine can show
const lineTable = (k) => k.table || "income_entries";              // where a kind's lines are stored

const incomeKey = () => `${selectedFunctionId}|${incomeView}`;
const incomeKind = () => LINE_KINDS.find((k) => k.key === incomeView);
const incomeRowIsEmpty = (r) => INCOME_FIELDS.every((f) => !r[f]);
const newIncomeRow = () => ({ id: crypto.randomUUID(), date: "", name: "", nameEn: "", phone: "", amount: 0, note: "", saved: false });

const lineButtonHtml = (k) =>
  `<button type="button" class="members-toggle income-btn ${incomeView === k.key ? "active" : ""}" data-income="${k.key}">${k.label}</button>`;

const incomeButtonsHtml = () => INCOME_KINDS.map(lineButtonHtml).join("");   // the buttons after "வரவு:"
const expenseButtonHtml = () => lineButtonHtml(EXPENSE_KIND);                // the செலவு button, on its own

// Called by app.js after every title render, and by setIncomeView.
function syncIncomeView() {
  document.getElementById("income-card").classList.toggle("hidden", !incomeView);
  document.body.classList.toggle("view-income", !!incomeView);
  document.querySelectorAll(".income-btn").forEach((b) => b.classList.toggle("active", b.dataset.income === incomeView));
  if (incomeView && incomeLoadedFor !== incomeKey()) loadIncome();
}

// Only one of members / செலவு / an income table is on screen at a time.
function setIncomeView(key) {
  incomeView = key;
  applySheetVisibility();   // app.js
  syncIncomeView();
}

async function loadIncome() {
  const funcId = selectedFunctionId;
  const key = incomeKey();
  const k = incomeKind();
  incomeLoadedFor = key;
  incomeRows = [];
  renderIncome();
  setStatus("income-status", "", false);
  if (!funcId || !k) return;
  let query = client.from(lineTable(k)).select("*").eq("function_id", funcId);
  if (!k.table) query = query.eq("kind", k.key);   // income lines share one table, told apart by kind
  const { data, error } = await query.order("created_at").order("id");
  if (key !== incomeKey()) return;   // the user switched function or table while this was loading
  if (error) {
    incomeLoadedFor = null;          // try again the next time the view is synced
    setStatus("income-status", "Error loading: " + error.message, true);
    return;
  }
  incomeRows = data.map((r) => {
    const row = { ...newIncomeRow(), id: r.id, saved: true };
    k.columns.forEach((c) => { row[c.field] = FIELD_TYPES[c.field].fromDb(r[FIELD_TYPES[c.field].db]); });   // only this kind's columns exist in its table
    return row;
  });
  if (!incomeRows.length) incomeRows.push(newIncomeRow());   // a table with one empty row to type into
  renderIncome();
}

function renderIncomeTotal() {
  const total = incomeRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  document.getElementById("income-total").textContent = formatMoney(total);
}

function incomeCell(col, row) {
  const t = FIELD_TYPES[col.field];
  const value = col.field === "amount" ? (row.amount ? formatMoney(row.amount) : "") : row[col.field];   // an empty amount shows blank, not 0
  const extra = t.mode ? ` inputmode="${t.mode}"` : "";
  const placeholder = col.placeholder ? ` placeholder="${escapeHtml(col.placeholder)}"` : "";
  return `<td class="ic-${col.field}"><input type="${t.type}" class="f-income" data-field="${col.field}" value="${escapeHtml(String(value))}"${extra}${placeholder} /></td>`;
}

function renderIncome() {
  const k = incomeKind();
  if (!k) return;
  document.getElementById("income-head").innerHTML =
    `<tr><th class="ic-sno">S.No</th>${k.columns.map((c) => `<th class="ic-${c.field}">${c.label}</th>`).join("")}<th class="ic-del"></th></tr>`;
  document.getElementById("income-body").innerHTML = incomeRows.map((r, i) => `<tr data-id="${r.id}">
      <td class="ic-sno">${i + 1}</td>
      ${k.columns.map((c) => incomeCell(c, r)).join("")}
      <td class="ic-del"><button type="button" class="income-del" title="நீக்கு" aria-label="Remove this row">&times;</button></td>
    </tr>`).join("");
  // The label sits under the first column that is not the date; the total sits under the தொகை column.
  const amountAt = k.columns.findIndex((c) => c.field === "amount");
  const labelAt = k.columns.findIndex((c) => c.field !== "date");
  document.getElementById("income-foot").innerHTML = `<tr><td class="ic-sno"></td>${k.columns.map((c, i) =>
    i === labelAt ? `<td>${k.totalLabel}</td>` : i === amountAt ? `<td id="income-total">0</td>` : "<td></td>").join("")}<td></td></tr>`;
  renderIncomeTotal();
}

// `row` is the row object itself (not looked up by id) so a save still finds it after the user switched table.
async function saveIncome(row, funcId, kindKey) {
  const k = LINE_KINDS.find((x) => x.key === kindKey);
  const showing = incomeKey() === `${funcId}|${kindKey}`;
  let error = null;
  if (incomeRowIsEmpty(row)) {
    if (!row.saved) return;          // nothing typed, nothing stored: nothing to do
    ({ error } = await trackedSave(client.from(lineTable(k)).delete().eq("id", row.id)));
    if (!error) row.saved = false;   // the user cleared a stored row: it is gone, the empty row stays to type into
  } else {
    const payload = { id: row.id, function_id: funcId, updated_at: new Date().toISOString() };
    if (!k.table) payload.kind = k.key;
    k.columns.forEach((c) => { payload[FIELD_TYPES[c.field].db] = FIELD_TYPES[c.field].toDb(row[c.field]); });
    ({ error } = await trackedSave(client.from(lineTable(k)).upsert(payload, { onConflict: "id" })));
    if (!error) row.saved = true;
  }
  setStatus("income-status", error ? "Error saving: " + error.message : "", !!error);
  if (error || !showing) return;
  const tr = document.querySelector(`#income-body tr[data-id="${row.id}"]`);
  if (!tr) return;
  tr.classList.add("row-saved");
  setTimeout(() => tr.classList.remove("row-saved"), ROW_SAVE_BLINK_MS);
}

document.getElementById("income-body").addEventListener("input", (e) => {
  const input = e.target.closest(".f-income");
  const row = input && incomeRows.find((r) => r.id === input.closest("tr").dataset.id);
  if (!row || !selectedFunctionId) return;
  if (input.dataset.field === "phone") filterMobileInput(input);   // shared.js: digits and "+" only
  if (input.dataset.field === "amount") filterWholeNumber(input);   // whole rupees only
  row[input.dataset.field] = FIELD_TYPES[input.dataset.field].read(input.value);
  renderIncomeTotal();
  const funcId = selectedFunctionId;   // captured now: the save still goes to this function if the user switches
  const kind = incomeView;
  clearTimeout(incomeSaveTimers[row.id]?.timer);
  const timer = setTimeout(() => { delete incomeSaveTimers[row.id]; saveIncome(row, funcId, kind); }, SAVE_DEBOUNCE_MS);
  incomeSaveTimers[row.id] = { timer, row, funcId, kind };
});

// Tab hidden or closed with a line still waiting on its debounce: save it now (see shared.js).
registerLeaveSaver(() => {
  Object.values(incomeSaveTimers).forEach(({ timer, row, funcId, kind }) => {
    clearTimeout(timer);
    delete incomeSaveTimers[row.id];
    saveIncome(row, funcId, kind);
  });
});

// Like the members sheet: once the user leaves a phone box, show the number in groups (shared.js formatMobile).
document.getElementById("income-body").addEventListener("change", (e) => {
  const input = e.target.closest(".f-income");
  if (!input || input.dataset.field !== "phone") return;
  input.value = formatMobile(input.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

// The amount box: plain digits while typing, Indian grouping when you leave (see shared.js).
document.getElementById("income-body").addEventListener("focusin", (e) => { if (e.target.dataset?.field === "amount") editMoneyBox(e.target); });
document.getElementById("income-body").addEventListener("focusout", (e) => { if (e.target.dataset?.field === "amount") showMoneyBox(e.target); });

document.getElementById("income-body").addEventListener("click", async (e) => {
  if (!e.target.closest(".income-del")) return;
  const row = incomeRows.find((r) => r.id === e.target.closest("tr").dataset.id);
  if (!row) return;
  if (!incomeRowIsEmpty(row) && !confirm("இந்த வரியை நீக்கவா? (Remove this row?)")) return;
  clearTimeout(incomeSaveTimers[row.id]?.timer);
  delete incomeSaveTimers[row.id];
  incomeRows = incomeRows.filter((r) => r !== row);
  if (!incomeRows.length) incomeRows.push(newIncomeRow());
  renderIncome();
  if (!row.saved) return;
  const { error } = await client.from(lineTable(incomeKind())).delete().eq("id", row.id);
  if (error) {                          // still stored: reload so the screen shows the truth, then say why
    incomeLoadedFor = null;
    await loadIncome();
    setStatus("income-status", "Error removing: " + error.message, true);
  }
});

document.getElementById("income-add").addEventListener("click", () => {
  if (!selectedFunctionId || !incomeView) return;
  incomeRows.push(newIncomeRow());
  renderIncome();
  const firstInputs = document.querySelectorAll("#income-body tr:last-child .f-income");
  if (firstInputs.length) firstInputs[0].focus();
});

document.getElementById("sheet-title").addEventListener("click", (e) => {
  const btn = e.target.closest(".income-btn");
  if (btn) setIncomeView(incomeView === btn.dataset.income ? null : btn.dataset.income);
});
