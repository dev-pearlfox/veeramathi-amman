# Architecture: Sri Veeramathi Amman Thunai

How the app is built. Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit). For product intent see [PRD.md](./PRD.md); for visual rules see
[DESIGN.md](./DESIGN.md); for the protected layout code see
[function-expenses/HEART_LOGIC.md](./function-expenses/HEART_LOGIC.md).

---

## 1. Shape of the system

Two **static, client-side sites** in one repo. No server of our own, no build, no framework, no bundler. Plain HTML,
CSS and `<script defer>` files. Both talk straight to one **Supabase** project (Postgres + Auth) from the browser.

```
browser (Accounts)  --\
                       >-- Supabase (Postgres, Row Level Security, Auth)
browser (Dashboard) --/
        |
 GitHub Pages (served from main, whole repo)  ->  veeramathi.pearlfox.io
```

External scripts: Supabase JS and (Dashboard only) Chart.js, pinned to a version and loaded with SRI hashes.
Fonts come from Google Fonts.

## 2. Repo map

```
/                         shared files + docs
  income-categories.js    the extra income tables (INCOME_KINDS): one copy for both sites
  expense-lines.js        the expense table (EXPENSE_KIND)
  function-rules.js       who belongs to a function (eligiblePeople), FUNCTION_NAMES
  money-format.js         formatMoney (Indian grouping)
  password-toggle.js/.css show / hide password eye
  CNAME, .github/workflows/pages.yml, scripts/backup-to-csv.mjs
function-expenses/        Accounts + Members
functions-dashboard/      Dashboard + Invitation, supabase/schema.sql
```

### 2.1 function-expenses (Accounts)

| File | Role |
|---|---|
| `index.html`, `app.js` | Ledger sheet page: sign-in gate, function pills, sheet rows, the title block with the வரவு / செலவு buttons and the settings pill, tick handling |
| `members.html`, `members.js` | Members page; `member-address.js` is the address popup; `members-print.js` prints the list |
| `shared.js` | Helpers both pages use: formatting, aria labels, the leave-page saver (`registerLeaveSaver`, `trackedSave`) |
| `income.js` | The table engine for every வரவு tab and செலவு (`LINE_KINDS`), with the pinned header table and body table |
| `expenses.css`, `style.css` | Styles. `style.css` has the Heart Logic layout |
| `date-picker.js/.css` | Own calendar popup; on touch it opens the phone's picker with `showPicker()` |
| `sheet-note.js/.css` | The notes icon and popup |
| `print.js`, `print-table.js` | Print / save as PDF through a print-only block |
| `receipt.js` | The receipt box and its buttons |
| `receipt-image.js`, `receipt-art.js` | Draws the receipt as one PNG on a canvas; Amma photo embedded as a data URL |
| `receipt-settings.js` | Receipt numbering counter, the settings pill and dialog |
| `receipt-folder.js` | The chosen receipt folder (File System Access API, handle kept in IndexedDB) |
| `receipt.css` | Receipt and settings dialog look |
| `supabase-config.js` | Project URL, public key, the fixed login email |

Script load order on `index.html` (it matters): `shared.js`, `date-picker.js`, root files, `income.js`,
`print-table.js`, `print.js`, `sheet-note.js`, `receipt-art.js`, `receipt-image.js`, `receipt-folder.js`,
`receipt.js`, `receipt-settings.js`, `app.js`. Receipt files read `app.js` globals only when a tick happens, never
at load.

### 2.2 functions-dashboard

| File | Role |
|---|---|
| `index.html`, `app.js` | Shell: sign-in gate, three tabs |
| `core.js` | First to load. Supabase client with its **own storage key**, small helpers |
| `data.js` | Loads every table once; `summarize()` is the one place totals are computed. `COLUMNS` lists what each screen reads: a screen that needs a new column must add it there |
| `overview.js`, `explore.js`, `admin.js` | The three sections |
| `widgets.js`, `charts.js`, `compare.js`, `unpaid.js`, `print.js` | Pieces of those sections |
| `invitation.js` | The Admin card, full-screen preview, edit mode, the print chooser |
| `invitation-pages.js` | Builds every page as HTML and lays them on sheets |
| `invitation-text.js` | The fixed wording |
| `invitation-cover.js` | Page 1 (cover) markup |
| `invitation.css` | Page and print styles (inches) |
| `invitation-festive.css` | The Rich festive look, all inside `@media print` |
| `invitation/` | Ornaments and cover pictures |
| `supabase/schema.sql` | The whole database in one file; `migrate-receipt-no.sql` is a one-time change |

## 3. Data model (Supabase)

One file, `functions-dashboard/supabase/schema.sql`, safe to run again.

| Table | Holds | Notes |
|---|---|---|
| `people` | Members | unique `name`, `member_no`, `roll_number`; `avoid` boolean; `address` jsonb (Member Origin) and `postal_address` jsonb (Postal Address; run `backups/add-postal-address.sql` once on an existing database) |
| `functions` | Events | `name` + `year` unique; `santha_amount` default 1200 |
| `ledger_entries` | Per member per function | unique `(function_id, person_id)`; `receipt_no`, `santha`, `santha_checked`, `donation`, `total`, `paid` (remark) |
| `expense_entries` | செலவு lines | `name`, `amount >= 0`, `note` |
| `income_entries` | Every extra வரவு line | `kind` (key from `income-categories.js`), `received_on`, `receipt_no`, `amount`, `name`, `note` |
| `materials` | Nothing yet | The Dashboard reads it for a Materials tile and chart; nothing writes to it, so it stays empty. The invitation's gifts-in-kind page is wording in `invitation-text.js`, not this table |

Deleting a function cascades to its lines.

## 4. Auth and access

- Supabase Auth, email + password. Two accounts: Accounts (`admin@veeramathi.local`) and Dashboard
  (`dashboard@veeramathi.local`). People type only the password.
- The two sites use different session storage keys, so signing in to one never signs in to the other.
- Row Level Security is on for every table. Policy: any **signed-in** user can read and write (the public key alone
  gets nothing). The two accounts are equal to the database; the separation is in the pages. The Dashboard is
  deliberately **not** read-only (see MEMORY.md, M7).
- Passwords are changed from Dashboard, Admin tab.

## 5. The table engine (Accounts)

`income.js` runs every வரவு tab and செலவு from a description object (`INCOME_KINDS` entries and `EXPENSE_KIND`):
which `columns`, which `field` each uses, optional `colWidths`, `totalLabel`, and for expense a `table` of its own.
Adding a tab means adding one entry to `income-categories.js` (never rename an existing `key`).

Each tab renders two tables, a pinned header table (`#income-thead-wrap`, inside `.sticky-top-stack`) and a body table
(`#income-tbody-wrap`), with identical literal-px `<col>` widths from `incomeColumnWidths(k)` so they cannot drift.
The header follows the body's sideways scroll and the other way round.

## 6. The receipt pipeline

1. Tick (`app.js`) calls `openReceiptBox(tr)`; if the receipt field is empty and numbering is on, it takes the next
   number (`receipt-settings.js`).
2. `receipt-image.js` draws the PNG on a canvas.
3. Buttons: WhatsApp (phone: share sheet; laptop: copies the picture and opens the chat, then paste), Print
   (A5 page), Save image, SMS (short Tamil text).
4. With a receipt folder chosen (`receipt-folder.js`), WhatsApp, Print, Save image and SMS file the PNG there first.
   Without one, Save image downloads normally. Only laptop Chrome / Edge support the folder picker.
5. Counter key: `localStorage["veeramathi.nextReceiptNo"]`. Folder handle: IndexedDB `veeramathi-receipts`. Both are
   per device.

## 7. The invitation pipeline

`invitation-pages.js` builds each page from `data.js` and the fixed wording, then lays pages on sheets. Page 9 x 12
in; two pages make an 18 x 12 in sheet; page count is rounded up to a multiple of 4. Row heights in the builder must
match the `--rh` each table gets in `invitation.css`, or the page flow miscounts.

Print modes (body classes set by `printAs()` in `invitation.js`): none for the booklet, `inv-sharing` for WhatsApp
Normal, `inv-sharing inv-festive` for Rich festive. Festive styles apply only under
`body.inv-festive #inv-share .inv-page` inside `@media print`, and swap the black ornaments for ready-tinted copies
(`toran-maroon.png`, `dancer-maroon.png`, `peacock-maroon.png`, `corner-gold.png`) by `content: url()`. CSS and SVG
colour filters were tried first; the real PDF drew faint boxes around the ornaments, so tinted files were used.

## 8. Cache-busting

Every CSS / JS file is loaded as `file?v=YYYYMMDDx`. Bump it on every change, on **every page** that loads the file.
There is no build step to do this, so it is a manual rule (RULES.md).

## 9. Deploy

Push to `main` -> `pages.yml` uploads the repo root as the Pages artifact -> live at `veeramathi.pearlfox.io`.
The workflow does no build. `backups/` is git-ignored.

## 10. Testing approach

Pages are login-gated, so layout and behaviour are checked with **headless Chrome driven over the DevTools
protocol**, against a stripped copy of the page with a **fake Supabase** (fake data, no network). Measure with
`getBoundingClientRect`, then view screenshots. This is simulation: it does not replace a real phone, a real
database save, or a real print dialog. MEMORY.md lists what has and has not been checked on real devices. The test
scripts live in `/tmp` and are not in the repo.
