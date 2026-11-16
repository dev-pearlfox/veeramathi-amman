# HEART LOGIC INDEX — function-expenses/

**Applies to:** `index.html`, `members.html`, `style.css`, `app.js`, `members.js`, `shared.js` (and
`income.js`, `expenses.css`, which sit on top of it)

Do not change any of the following without asking first (warn **"Warning: Heart
Logic"** and get explicit permission before touching any of it). Each of these
was arrived at after a real, measured problem — reverting to something that
"looks simpler" reintroduces the original bug. Full reasoning for each lives
as a comment at its actual code location; this file is the index.

---

## 1. `.sticky-top-stack` (style.css)
Header + `.members-filter-card` + `.members-thead-wrap` share ONE sticky
container instead of each being independently sticky. Independent sticky +
JS-measured offsets caused a real two-stage stutter (one piece shrank a frame
before its neighbor's position updated).

## 0. The header stack is ALWAYS in the compact (shrunk) state
Owner decision (permission given): `<body class="is-compact">` is set in `index.html` and `members.html`, and never removed.
There is no scroll-triggered shrink, no expand-on-wheel-up and no scroll freeze any more, so `scroll-compact.js` was deleted.
The `body.is-compact ...` rules in `style.css` (formerly `body.is-scrolled`, same rules, renamed) are the one and only layout.
The scale constants in `app.js`, `members.js` and `shared.js` must still match the `scale()` values in those rules.
Do not add the old scroll listener back: it only existed to toggle this class.

## 0b. `body.view-income .sticky-top-stack { display: flow-root }` (expenses.css)
On the வரவு/செலவு tabs the ledger header row is hidden, so the title's negative margin-bottom (the 0.7 scale collapse) leaked out of
the stack and the stack painted over the top of the income tables, hiding their column header. flow-root keeps the margin inside the
stack. Do not remove it. The income tables also scroll inside their own box (`.income-card .table-wrap`, height from `--stack-h`
set in app.js) so their column header can stay pinned.

## 2. `transform:scale()` vs padding/font-size for shrink animations
(header h1, `.members-filter-card` in style.css) — transform is
compositor-only (no forced layout recalc every frame); padding/font-size
transitions do force it, and cost scales with total page size. The table's
own header/filter row is the ONE exception, left on padding/font-size
deliberately — switching it to transform breaks column alignment with
`.members-tbody-wrap`.

## 3. `header h1` uses `transform:scale()`, never font-size (style.css)
Animating font-size on wrapping text causes a discrete (unsmoothable) jump
exactly when it collapses from 2 lines to 1.

## 4. `syncPillsCardCollapse()` measures `card.offsetHeight` directly (members.js)
Not the parent's auto-computed height — a negative margin-bottom on a
width-constrained element doesn't reduce the parent's height correctly
(confirmed on the real page, root cause never fully isolated).

## 5. `.members-thead-wrap` / `.members-tbody-wrap` / `.members-table-card`
carry their own border/radius/shadow directly, no `.card` wrapper (style.css)
— the "no container" spreadsheet look. `overflow:hidden` on both wrappers
(not just `overflow-x`) is what actually rounds the corners, since
border-radius directly on a `<th>`/`<td>` is unreliable under
`border-collapse:collapse`.

## 6. `.sticky-top-inner` uses the exact same max-width:1320px/margin:auto/padding
container `<main>` uses (style.css) — not similar values, the literal same
mechanism, so the pills bar/spreadsheet header structurally can't drift out
of alignment with `.members-table-card`. An earlier version computed width
via `max-width:min(calc(...),1288px)` directly on `.members-thead-wrap` —
verified correct in every automated check across two browser engines, but
intermittently rendered flush-left on a real device, fixed by reload.

## 7. `table.members-table` column widths are literal fixed px
(style.css, already marked HEART LOGIC there) — do not stretch to fill wide
screens. (Now 7 columns, still 1176px in total: the English Name column was removed
with the owner's permission and its 230px went to பெயர், which is 460px, so the whole
"husband - wife" name shows. The nth-child rules were renumbered to match.) A percentage-based stretch version was built and tested, then
explicitly reverted.

The Accounts Ledger Sheet (`table.sheet:not(.members-table)`, index.html) has the same rule, also
fixed px and 1070px in total. Its குறிப்பு column was cut from 170px to 30px (an icon only,
sheet-note.js) and the freed 140px went to பெயர், now 450px, with the owner's permission. Only the
widths changed: the sticky header/filter stack and the scroll shrink animations are untouched. The
filter box for that column was dropped.

## 8. `table.sheet tbody` odd/even row backgrounds are explicit
`var(--surface)` / `var(--surface-2)` (style.css), not left transparent —
the table sits directly on the page background now (no white card behind
it), so transparent showed the page's own faint cream tint instead of white.

## 9. (retired) Members page filter pill
The Members page used to show one "மொத்த குடும்பத் தலைவர்கள் - 82" pill in a
nowrap `.pill-row`. It was not clickable and the page has a single list, so the
owner asked for it to be removed completely (pill, count and its CSS). The
filter card now holds only the Print button. The `.members-filter-card` scroll
shrink (item on `syncPillsCardCollapse`) still applies to that card. The
`.pill-row` rules on index.html are unchanged. (The வருடம்/விழா rows were later merged by the owner into ONE row of
"function (year)" pills, oldest year first; the shrink scale, `syncSheetFilterCardCollapse` and the sticky stack were left as they were.)

## 10. Cache-busting `?v=...` on style.css / shared.js / members.js / app.js / income.js / expenses.css
(both `members.html` and `index.html`, and the dashboard's files in its `index.html`) — browsers repeatedly served a stale
cached copy after a real deploy until a manual hard refresh, which on
`index.html` once surfaced as a much worse symptom than stale styling: a
stale `app.js` referencing an element id that had been renamed in a
restructure silently threw and aborted before the ledger rows ever rendered,
leaving only the static header row visible with no data — **bump the version
string on every future change to any of these files, on both pages, every
time.**

## 11. CDN scripts use SRI (Subresource Integrity) hashes
The Supabase (and Chart.js on the dashboard) script tags have `integrity="sha384-..."`
attributes. This means if the CDN ever serves modified/malicious code, the
browser refuses to run it. If you EVER bump the pinned version (e.g., Supabase
2.116.0 → 2.117.0), you MUST regenerate the hash:

```bash
curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@NEW_VERSION/dist/umd/supabase.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Or use https://www.srihash.org/. Forgetting to update the hash after a version
bump = the page silently fails to load Supabase and nothing works.

## 12. Deployment: one repo, one home
There is ONE repo, `Veeramathiymman-Kula-thaiva-valipadu` (GitHub account to be decided). GitHub Pages serves it from `main` at
https://veeramathi.pearlfox.io (see `CNAME`), and it takes about a minute after a push. Both sites (`function-expenses/`
and `functions-dashboard/`) and the shared root files deploy together. After a push, verify by fetching the live URL
directly (e.g. `curl -s https://veeramathi.pearlfox.io/function-expenses/ | grep "v="`), not just by trusting the push.
(An older version of this note described a second mirror repo served at newmantech.in; that no longer applies.)
