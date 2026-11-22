# PRD: Sri Veeramathi Amman Thunai

Product requirements. Live at <https://veeramathi.pearlfox.io>. Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit).

Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) (how it is built), [DESIGN.md](./DESIGN.md) (how it looks),
[RULES.md](./RULES.md) (how we work), [TASKS.md](./TASKS.md) (what is next), [MEMORY.md](./MEMORY.md) (what we decided
and learned).

---

## 1. Purpose

A temple society keeps the money records of its yearly festival (the main one is தை திருவிழா, in Thai month) and
the other functions. Today that means ledgers, receipts and a printed invitation booklet. This product replaces
the paper work with two small websites:

- one for **entering** the data (Accounts), and
- one for **seeing** it and producing the invitation (Dashboard, called "Admin Page").

## 2. Users

| Who | Uses | Needs |
|---|---|---|
| Society clerk / treasurer | Accounts | Fast data entry, often on a phone or tablet; receipts to hand out or send; never lose an entry. |
| Society office-bearers | Dashboard | Totals per function and year, who has not paid, a printable booklet. |
| Owner (Manvi, PearlFox) | Both | Small, safe changes; nothing that breaks the pinned layout. |
| Members | Nobody logs in | They receive a receipt picture (WhatsApp, SMS or print) and the printed booklet. |

## 3. Goals

1. Record every rupee in and out per function, per year, with a receipt number.
2. Make paid / unpaid obvious (head tax is a fixed amount per function, ticked when paid).
3. Hand the member a clear receipt straight away.
4. Show totals and year-on-year comparison without a spreadsheet.
5. Produce the invitation booklet from the same data, ready for the print shop or WhatsApp.
6. Work on a phone. Stay cheap: no server, no build, no paid backend.

## 4. Non-goals

- No public pages with member data. Everything needs a login.
- No member self-service login.
- No paid messaging service. Receipts go out as a picture through the device's own share sheet.
- No "forgot password" email. The login emails end in `.local` and cannot receive mail; resets go through Supabase.
- No build tooling or framework.

## 5. Features

### 5.1 Accounts (`function-expenses/`)

**Members page.** One list of house heads. Fields: Tamil name, English name, Home Address (the old ஊர் place, with its own address popup), Postal Address (a second address popup), mobile,
date of birth, S.No., roll number (permanent, starts at 1001), Avoid flag. Column filters, print. A lock mode keeps
accidental edits out. Every member is on every function's sheet, except those marked Avoid (unless they already
have an entry for that function, so recorded money never disappears).

**Ledger sheet.** Pick a function (pills of "name (year)", oldest year first). One row per member: receipt no.
(இரசீது எண்), தலைக்கட்டு வரி (a fixed amount per function, ticked when paid), notes (குறிப்பு icon with a popup),
total. Autosave; edits are saved if the tab is closed or hidden.

**வரவு tabs** beside the members tab, in this order: முந்தைய இருப்பு, உண்டியல், திருப்பணி நன்கொடை, நன்கொடை,
பௌர்ணமி / முடி காணிக்கை. Each has its own columns and total label (see `income-categories.js`).
The two donation tabs (திருப்பணி நன்கொடை, நன்கொடை) have a மொபைல் எண் column after பெயர். When the பெயர் box is left and its
text exactly equals a member's Tamil name (or English name, ignoring capitals), that member's mobile is copied into the
row, replacing what was typed. It is a copy, not a link. A member with no mobile, or a name that is not a member, leaves
the row alone.
**செலவு** is a free list (description, amount, note).

**Receipts.**
- Ticking a head-tax box opens the receipt box: receipt number, a preview picture, and the buttons WhatsApp,
  Print receipt, Save image, SMS, Not now. Nothing is sent by itself.
- Receipt numbering: a pill after the செலவு tab shows "Next 107". Tapping it sets the starting number. After that,
  ticking a row with an empty receipt field fills the next number in. Saved on that device only.
- Receipt folder (laptop Chrome or Edge): receipt pictures are filed into a chosen folder. File name:
  `<receipt no>_தலைக்கட்டு_இரசீது_<member full name>.png`.

**Print / save as PDF** for the ledger sheet and the members list.

### 5.2 Dashboard (`functions-dashboard/`)

- **Overview**: all years and functions: வரவு, செலவு, மீதி, charts, a scoreboard row per function (click opens it in
  Explore), and Compare years.
- **Explore**: the same numbers filtered by Year and Function pills, the per-person ledger, a Materials tile (the
  table is empty today), and the
  Unpaid சந்தா list with tap-to-call.
- **Admin**: add a function, set a function's fixed head-tax price, change the Dashboard and Accounts passwords,
  sign out, and the **Invitation** card.
- **Print / save as PDF** of a one-page summary.

### 5.3 Invitation booklet

- Built from the live data for the festival the year **after** the accounts year (2026 accounts give the
  January 2027 festival).
- 12 pages, each 9 x 12 in. Order: cover, invitation letter, donors and appeal, the long lists (head-tax payers,
  donors), gifts in kind, expense list, income and expense summary. Blank pages are added so the count is a multiple
  of 4.
- Preview, one page at a time, pinch to zoom on touch. Every page is editable; a red "Edit Mode" banner shows.
- Three outputs: **Booklet print** (black and white, two pages per 18 x 12 in sheet, imposed 12|1, 2|11, 10|3,
  4|9, 8|5, 6|7), **WhatsApp sharing - Normal** (colour PDF, single pages), **WhatsApp sharing - Rich festive**
  (colour with maroon and gold frame, ornaments and styled tables).
- Cover: Amma in the middle, Ganesha on the left and Murugan on the right.

## 6. Business rules

- **Head tax (தலைக்கட்டு வரி)**: one fixed amount per function (default 1200), set on the Dashboard. A ticked box
  counts as that amount. The rule of who pays lives only in `function-rules.js`.
- **முந்தைய இருப்பு** (last year's leftover) counts in வரவு and மீதி on the Dashboard **only when one year is
  selected**. Across several years it would count the same money twice.
- A function name is unique per year.
- Income kind keys (stored in the database) are never renamed once data exists. Labels may change.

## 7. Quality bar

- Works on a phone first, then laptop. No sideways page scroll.
- Pinned header and filter stack stay put while the tables scroll (the "heart" layout, see HEART_LOGIC.md).
- Tamil text everywhere readable; amounts formatted the Indian way (for example 1,74,455).
- A page never silently loses typed data.

## 8. Open product questions

See [TASKS.md](./TASKS.md), section "Questions for the owner".
