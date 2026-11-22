// Data layer: loads every table once, and answers "what are the totals for these functions?" in ONE place
// (summarize) so Overview, the scoreboard and Explore can never disagree.

let people = [];
let functionsList = [];
let ledgerEntries = [];   // வரவு (income): per-person collections (santha = head tax, total)
let materials = [];
let expenseEntries = [];  // செலவு (expense): one row per typed line (description + amount), see supabase/schema.sql
let incomeEntries = [];   // extra வரவு typed on the Accounts page (INCOME_KINDS), see supabase/schema.sql
let fundCollections = []; // the fund drives the admin made inside a function (their money is in incomeEntries, kind "fund:<id>")

// The columns the Dashboard actually reads, per table. Selecting only these keeps each load small (the people table's
// `address` JSON, for one, is never shown here). If a screen ever needs another column, add it HERE or it will show blank.
const COLUMNS = {
  people: "id,name,name_en,member_no,member_group,family_group,mobile,avoid,place",
  functions: "id,name,year,santha_amount",
  ledger_entries: "id,function_id,person_id,receipt_no,santha,santha_checked,total,paid",
  materials: "id,function_id,item_name,quantity,unit,cost,created_at",
  expense_entries: "id,function_id,name,amount,created_at",
  fund_collections: "id,function_id,title,created_at",
  income_entries: "id,function_id,kind,amount,name,receipt_no",   // name + receipt_no: the printed invitation booklet (invitation-pages.js)
};

// Supabase returns at most 1000 rows per request, so a plain select would SILENTLY drop rows once a table grows
// past that (and the totals would just be wrong). This pages through until a short page comes back. `order` must
// be a stable order, otherwise pages can overlap or skip rows.
async function fetchAll(table, order) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await order(client.from(table).select(COLUMNS[table])).range(from, from + PAGE - 1);
    if (error) return { data: rows, error };
    rows.push(...data);
    if (data.length < PAGE) return { data: rows, error: null };
  }
}

// Replaces all in-memory data. Returns a list of human-readable problems (empty when all is well) for the banner.
async function loadAll() {
  const byId = (q) => q.order("id");
  const [p, f, l, m, x, inc, fc] = await Promise.all([
    fetchAll("people", (q) => q.order("member_no", { ascending: true, nullsFirst: false }).order("name").order("id")),
    fetchAll("functions", (q) => q.order("year").order("id")),
    fetchAll("ledger_entries", byId),
    fetchAll("materials", byId),
    fetchAll("expense_entries", byId),
    fetchAll("income_entries", byId),
    fetchAll("fund_collections", (q) => q.order("created_at").order("id")),   // missing until backups/fund-collections.sql is run: then just none
  ]);
  // A failed table keeps what is already on screen (a refresh when the user comes back to the tab must not replace good
  // numbers with an empty or half-loaded table); on the very first load there is nothing yet, so whatever came back is used.
  const take = (current, r) => (r.error && current.length ? current : r.data);
  people = take(people, p).sort(compareMembers);   // தலைக்கட்டு first, then Others (member-order.js). Family table order (member-order.js): S.No. repeats in every table
  functionsList = take(functionsList, f);
  ledgerEntries = take(ledgerEntries, l);
  materials = take(materials, m);
  expenseEntries = take(expenseEntries, x);
  incomeEntries = take(incomeEntries, inc);
  fundCollections = take(fundCollections, fc);

  const problems = [];
  [["people", p], ["functions", f], ["ledger_entries", l], ["materials", m]].forEach(([name, r]) => {
    if (r.error) problems.push(`Could not load ${name}: ${r.error.message}`);
  });
  if (x.error) {
    problems.push(
      "Expenses are not available yet (" + x.error.message + "). Run functions-dashboard/supabase/schema.sql " +
      "in Supabase; until then செலவு shows 0."
    );
  }
  if (inc.error) {
    problems.push(
      "The extra வரவு tables are not available yet (" + inc.error.message + "). Run " +
      "functions-dashboard/supabase/schema.sql in Supabase; until then they show 0."
    );
  }
  return problems;
}

const functionLabel = (f) => `${f.name} (${f.year})`;
const allFunctionIds = () => new Set(functionsList.map((f) => f.id));
const functionIdsForYear = (year) => new Set(functionsList.filter((f) => f.year === year).map((f) => f.id));
const sortedYears = () => [...new Set(functionsList.map((f) => f.year))].sort((a, b) => a - b);

// Every kind of வரவு, in display order: the ledger's head tax, then the Accounts-page tables (INCOME_KINDS from
// ../income-categories.js). ONE list, so the tiles, the by-type chart, the Explore bars and the printout always show
// the same parts. `amount(income)` reads that part out of summarize().income; `color` is a --series-N CSS variable.
const INCOME_PARTS = [
  { label: "தலைக்கட்டு வரி", color: "--series-1", amount: (i) => i.santha },
  ...INCOME_KINDS.map((k, n) => ({ label: k.label, color: `--series-${5 + n}`, amount: (i) => i.extra[k.key] || 0 })),
];
const LEDGER_INCOME_FIELDS = ["santha", "total"];

// Totals for a set of function ids. `income` has the ledger head tax (`santha`) plus `total` = everything that
// counts as வரவு: the stored per-person ledger totals + the extra Accounts-page income (`income.extra`, by kind).
// Carry-over money (முந்தைய இருப்பு, last year's leftover) counts only when the selection covers ONE year; across
// several years it would be counted twice, so it is left out and reported in `income.carryNotCounted` instead.
// `balance` = income.total - expense (மீதி). `expenses` are the typed செலவு lines.
function summarize(funcIds) {
  const entries = ledgerEntries.filter((e) => funcIds.has(e.function_id));
  const expenses = expenseEntries.filter((r) => funcIds.has(r.function_id));
  const oneYear = new Set(functionsList.filter((f) => funcIds.has(f.id)).map((f) => f.year)).size <= 1;
  const income = { santha: 0, total: 0, extra: {}, carryNotCounted: 0 };
  entries.forEach((e) => LEDGER_INCOME_FIELDS.forEach((k) => { income[k] += Number(e[k] || 0); }));
  INCOME_KINDS.forEach((k) => { income.extra[k.key] = 0; });
  incomeEntries.filter((r) => funcIds.has(r.function_id)).forEach((r) => {
    if (isFundKind(r.kind)) return;   // a fund collection is not festival வரவு: it is shown apart (fundSummaries), never in the totals
    const amount = Number(r.amount || 0);
    if (!oneYear && INCOME_KINDS.some((k) => k.key === r.kind && k.isCarryOver)) { income.carryNotCounted += amount; return; }
    income.extra[r.kind] = (income.extra[r.kind] || 0) + amount;
    income.total += amount;
  });
  const expense = expenses.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return { entries, expenses, income, expense, balance: income.total - expense };
}

// The fund collections of `funcIds`, each with what it has collected: [{ fund, f (its function), total, count }], oldest function year first.
function fundSummaries(funcIds) {
  const fnById = new Map(functionsList.map((f) => [f.id, f]));
  return fundCollections
    .filter((x) => funcIds.has(x.function_id) && fnById.has(x.function_id))
    .map((fund) => {
      const lines = incomeEntries.filter((r) => r.kind === fundKindKey(fund.id));
      return { fund, f: fnById.get(fund.function_id), total: lines.reduce((s, r) => s + Number(r.amount || 0), 0), count: lines.length };
    })
    .sort((a, b) => a.f.year - b.f.year || a.fund.title.localeCompare(b.fund.title));
}

// வரவு without any carried-over money: what a running (cumulative) total over several years must use.
const incomeWithoutCarry = (income) =>
  income.total - INCOME_KINDS.filter((k) => k.isCarryOver).reduce((sum, k) => sum + (income.extra[k.key] || 0), 0);

// One { f, s } per function in `funcIds` (f = the function, s = summarize() of just that function), newest year first.
// Used by the Overview scoreboard and the printed summary.
function functionRows(funcIds) {
  return functionsList
    .filter((f) => funcIds.has(f.id))
    .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))
    .map((f) => ({ f, s: summarize(new Set([f.id])) }));
}

// Who has and has not paid the தலைக்கட்டு வரி for function `f`. "Paid" = the head-tax box is ticked on the Accounts page.
// Who is expected to pay comes from the shared rule (../function-rules.js). `pending` = unpaid people x the
// function's fixed head-tax amount. Others (member-order.js) are never counted as unpaid, only as paid once they pay.
function santhaStatus(f) {
  const entries = ledgerEntries.filter((e) => e.function_id === f.id);
  const paidIds = new Set(entries.filter((e) => e.santha_checked).map((e) => e.person_id));
  const eligible = eligiblePeople(people, f, entries).filter((p) => owesSantha(p, paidIds.has(p.id)));   // Others count only once they paid
  const unpaid = eligible.filter((p) => !paidIds.has(p.id));
  return { eligible: eligible.length, paid: eligible.length - unpaid.length, unpaid, pending: unpaid.length * Number(f.santha_amount ?? 0) };
}
