# Sri Veeramathi Amman Thunai: Accounts + Dashboard

Two static websites in one repo, sharing one Supabase database. No build step: open the HTML files in a browser.
Live at https://veeramathi.pearlfox.io (GitHub Pages, deployed from `main`).

| Folder | What it is |
|---|---|
| `function-expenses/` | **Accounts**: the data-entry site. House-heads ledger per function (receipt no., head tax, total, note), the செலவு (expense) free list, and the extra வரவு tables முந்தைய இருப்பு, உண்டியல், திருப்பணி நன்கொடை, நன்கொடை, பௌர்ணமி / முடி காணிக்கை. Autosaves. |
| `functions-dashboard/` | **Dashboard**: Overview, Explore and Admin tabs, charts, compare years, unpaid list, print / PDF, add functions, change passwords. |
| repo root | Files both sites load: `expense-lines.js`, `income-categories.js`, `function-rules.js`. |

## Sign-in

Both sites sign in through **Supabase Auth**, each with its OWN account and its own password. People only type the
password; the email is fixed in each `supabase-config.js`.

| Site | Account (email) |
|---|---|
| Accounts | `admin@veeramathi.local` |
| Dashboard | `dashboard@veeramathi.local` |

- Create both in Supabase: **Authentication, Users, Add user, Create new user** (tick **Auto Confirm User**).
- The two sites keep separate sessions, so signing in to one does not sign in to the other.
- Change either password from the Dashboard: **Admin, Change Dashboard password / Change Accounts page password**.
  Each needs that account's current password. Nobody has a "forgot password" email (`.local` cannot receive mail);
  reset through Supabase, Authentication, Users.
- Turn **off** "Allow new users to sign up" (Authentication, Sign In / Providers), or anyone can register on the project.
- The database only lets a signed-in user read or write. Both accounts are equal as far as the database is concerned;
  the separation is in the pages.

## Database (Supabase)

The whole database is ONE file: `functions-dashboard/supabase/schema.sql`. Paste it into the Supabase **SQL editor**
and run it once on a new project (it is safe to run again). It creates the tables (`people`, `functions`,
`ledger_entries`, `expense_entries`, `income_entries`, `materials`) and the access rules (signed-in users only).
There is no member "type": every member is on every function's sheet, except those marked Avoid.

## Rules of the code

- **Cache version.** Every CSS/JS file is loaded as `file.js?v=...`. Bump the version on every change, on every page
  that loads it. A stale cached script has broken the page before.
- **Do not rename keys.** `income-categories.js` keys (stored in `income_entries.kind`) must never change once data exists; labels can.
- **Who pays the head tax (தலைக்கட்டு வரி)** lives only in `function-rules.js`, used by both sites.
- **முந்தைய இருப்பு** (last year's leftover) counts in வரவு/மீதி only when ONE year is selected on the Dashboard;
  across several years it would count the same money twice.
- The Accounts page has protected layout rules: read `function-expenses/HEART_LOGIC.md` before touching its header,
  sticky stack or table styles.

## Run locally

Open `function-expenses/index.html` or `functions-dashboard/index.html` in a browser. They talk to the real database,
so sign in with the real passwords.
