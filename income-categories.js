// The extra வரவு (income) tables, beside the members button, in display order. ONE copy: the Accounts page builds
// its buttons and tables from it (function-expenses/income.js). The dashboard can load the same file when it
// starts counting these.
// `key` is what is stored in income_entries.kind (functions-dashboard/supabase/schema.sql); never rename a
// key once data exists. Labels and placeholders are wording and can be changed freely.
// `columns` is the table, left to right (the date comes after the amount). `field` is one of: date, name (Tamil name), nameEn (English name), phone,
// amount, receipt (இரசீது எண், income_entries.receipt_no), note. Each kind lists only the columns it needs (see FIELD_TYPES in function-expenses/income.js).
// `isCarryOver: true` marks last year's leftover money. The dashboard counts it in வரவு/மீதி only when a single
// year is selected; across several years it would count the same rupees twice (once when earned, once carried).
const INCOME_KINDS = [
  { key: "carry-forward", label: "முந்தைய இருப்பு",   // money left over from last year's festival
    isCarryOver: true,
    colWidths: { name: 160, amount: 100, date: 140, note: 200 },   // optional: each column's width in px (income.js); without it the name column takes what is left
    totalLabel: "மொத்தம்",
    columns: [
      { field: "name", label: "விவரம்", placeholder: "எ.கா. கடந்த ஆண்டு மீதி" },
      { field: "amount", label: "தொகை" },
      { field: "date", label: "தேதி" },
      { field: "note", label: "குறிப்பு" },
    ] },
  { key: "hundi", label: "உண்டியல்",   // the temple hundi
    colWidths: { name: 160, amount: 100, date: 140, note: 200 },
    totalLabel: "மொத்த உண்டியல்",
    columns: [
      { field: "name", label: "விவரம்", placeholder: "எ.கா. உண்டியல் திறந்தது" },
      { field: "amount", label: "தொகை" },
      { field: "date", label: "தேதி" },
      { field: "note", label: "குறிப்பு" },
    ] },
  { key: "thirupani", label: "திருப்பணி நன்கொடை",   // temple repair / painting donations
    totalLabel: "மொத்த திருப்பணி நன்கொடை",
    columns: [
      { field: "name", label: "பெயர்", placeholder: "பெயர்" },
      { field: "amount", label: "தொகை" },
      { field: "date", label: "தேதி" },
      { field: "receipt", label: "இரசீது எண்" },
      { field: "note", label: "குறிப்பு" },
    ] },
  { key: "donation", label: "நன்கொடை",   // festival gifts from people outside the house-head list
    totalLabel: "மொத்த நன்கொடை",
    columns: [
      { field: "name", label: "பெயர்", placeholder: "பெயர்" },
      { field: "amount", label: "தொகை" },
      { field: "date", label: "தேதி" },
      { field: "receipt", label: "இரசீது எண்" },
      { field: "note", label: "குறிப்பு" },
    ] },
  { key: "pournami", label: "பௌர்ணமி / முடி காணிக்கை",   // full-moon puja, upkeep, hair offering
    colWidths: { name: 160, amount: 100, date: 140, note: 200 },
    totalLabel: "மொத்தம்",
    columns: [
      { field: "name", label: "விவரம்", placeholder: "எ.கா. பூஜை, பராமரிப்பு" },
      { field: "amount", label: "தொகை" },
      { field: "date", label: "தேதி" },
      { field: "note", label: "குறிப்பு" },
    ] },
];
