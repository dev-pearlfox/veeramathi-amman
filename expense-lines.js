// The செலவு (expense) table: a free list that the user adds lines to (a description and an amount), like the printed
// expense page. It runs on the same table engine as the வரவு tables (function-expenses/income.js), so it is described
// the same way as an INCOME_KINDS entry (see income-categories.js for what `columns` means), plus:
//   `table`: the Supabase table its lines are stored in (functions-dashboard/supabase/schema.sql). Income lines share
//            income_entries and are told apart by `kind`; expense lines have a table of their own, so they need no kind.
// ONE copy, loaded by both sites (the Accounts page and the Dashboard).
const EXPENSE_KIND = {
  key: "expense", label: "செலவு", table: "expense_entries",
  totalLabel: "மொத்த செலவு",
  columns: [
    { field: "name", label: "விவரம்", placeholder: "எ.கா. பூஜை சாமான்கள்" },
    { field: "amount", label: "தொகை" },
    { field: "note", label: "குறிப்பு" },
  ],
};
