# Sri Veeramathi Amman Thunai

Accounts, members and a dashboard for a kula deivam (family deity) temple society, plus a printable festival
invitation booklet. By **PearlFox**, live at <https://veeramathi.pearlfox.io>.

Two static websites in one repo, sharing one Supabase database. There is no build step: the HTML files open
straight in a browser and GitHub Pages serves the repo as it is.

Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit).

## The two sites

| Folder | Called | What it is for |
|---|---|---|
| `function-expenses/` | **Accounts** | Data entry. Members page, the house-heads ledger per function, the செலவு (expense) list, the extra வரவு (income) tables, receipts. |
| `functions-dashboard/` | **Admin Page** (the Dashboard) | Totals, charts, compare years, unpaid list, add functions, change passwords, and the **Invitation** booklet. |

Files both sites load sit at the repo root: `income-categories.js`, `expense-lines.js`, `function-rules.js`,
`money-format.js`, `password-toggle.js/.css`, `filter-clear.js/.css`, logos, favicons and `og-image.jpg`.

## What it does

- **Members** (`function-expenses/members.html`): the society's house heads, with address popup, date of birth,
  roll number (from 1001), an Avoid flag for people no longer active, filters and print.
- **Ledger sheet** (`function-expenses/index.html`): one row per member per function: receipt number, தலைக்கட்டு வரி
  (head tax) with a paid tick, a note. Autosaves.
- **வரவு and செலவு tables**: முந்தைய இருப்பு, உண்டியல், திருப்பணி நன்கொடை, நன்கொடை, பௌர்ணமி / முடி காணிக்கை, and the
  செலவு free list.
- **Receipts**: ticking a paid box opens a box with a receipt picture. Send by WhatsApp, print, save the image or
  SMS. Receipt numbers can fill in by themselves ("Next 107" pill after the செலவு tab).
- **Dashboard**: Overview, Explore and Admin tabs; compare years; unpaid list; print or save as PDF.
- **Invitation booklet** (Dashboard, Admin tab): 12 pages, 9 x 12 in, preview with pinch to zoom, editable pages,
  print as a folded booklet, or as a WhatsApp PDF in a Normal or Rich festive look.

## Sign-in

Each site has its own Supabase Auth account and its own password. People only type the password; the email is fixed
in each `supabase-config.js`. Full details: [functions-dashboard/README.md](./functions-dashboard/README.md).
Passwords are never stored in this repo.

## Run locally

Open `function-expenses/index.html` or `functions-dashboard/index.html` in a browser. They talk to the real
database, so you sign in with the real password. For a server that never caches, use
`python3 function-expenses/_nocache_server.py`.

## Deploy

Push to `main`. The workflow `.github/workflows/pages.yml` publishes the whole repo to GitHub Pages
(`CNAME` is `veeramathi.pearlfox.io`). It takes about 20 to 60 seconds. Check it:

```
gh run list --limit 1
curl -s https://veeramathi.pearlfox.io/function-expenses/ | grep "v="
```

## Backups

`node scripts/backup-to-csv.mjs` asks for the Dashboard password (typed hidden, never saved) and writes one CSV per
table to `backups/<timestamp>/`. That folder is git-ignored because it holds names and phone numbers.

## The docs

| File | Read it for |
|---|---|
| [PRD.md](./PRD.md) | What the product must do and for whom |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How it is built |
| [DESIGN.md](./DESIGN.md) | Colours, fonts, layout rules, invitation look |
| [RULES.md](./RULES.md) | How we work on this repo (hard rules first) |
| [TASKS.md](./TASKS.md) | What is open |
| [MEMORY.md](./MEMORY.md) | Decisions and why, lessons, what was and was not tested. Read this first in a new session. |
| [function-expenses/HEART_LOGIC.md](./function-expenses/HEART_LOGIC.md) | The protected code of the Accounts site |
| [AUDIT_REPORT.md](./AUDIT_REPORT.md) | The 2026-11-15 audit and what was fixed |
