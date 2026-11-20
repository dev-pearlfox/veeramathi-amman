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

## 0b. The வரவு / செலவு tables copy the members sheet's structure (index.html, expenses.css, income.js)
`#income-thead-wrap` (a `.sheet-thead-wrap` with a `table.sheet`) lives INSIDE `.sticky-top-stack` after `#sheet-thead-wrap`, and the rows live in
`#income-tbody-wrap` (a `.sheet-tbody-wrap`) in `<main>`. Same two-table design as the first tab, same scrollLeft sync (app.js). Do not go
back to one table with a sticky `th`, or to a scrolling box inside the card: neither can pin under the stack while also scrolling sideways.
Both tables get identical literal-px `<col>` widths from `incomeColumnWidths()` in income.js, so header and rows cannot drift apart.
`body.view-income .sticky-top-stack { display: flow-root }` (expenses.css) keeps the title's negative margin (the 0.7 scale collapse) inside the
stack; without it `<main>` began above the stack's bottom edge and the stack painted over the top of these tables.

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
screens. (Now 9 columns, 1566px in total: S.No 70, Roll 76, பெயர் 440, English Name 210, Member Origin 190,
Postal Address 190, Mobile 170, பிறந்த தேதி 140, Avoid 80. With the owner's permission the English Name column,
once removed, came back and the Postal Address column was added; Member Origin is the old ஊர் column renamed.
The table is drawn 1567px wide (the collapsed outer border adds 1px), so the header frame and the pill row are 1569px (1567 + 2px frame border); at 1568 the table overflowed its frame by 1px and scrolled sideways for nothing. Because that is wider than the usual 1320px container, `members.html`
has `<body class="is-compact page-members">` and `body.page-members main, body.page-members .sticky-top-inner`
are both `max-width: 1601px` (1569 + 2 x 16px padding; kept EQUAL, see #6). Narrower screens scroll the table sideways inside its frame as
before. The nth-child rules were renumbered to match.) A percentage-based stretch version was built and tested, then
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
There is ONE repo, `Veeramathiymman-Kula-thaiva-valipadu` locally, `dev-pearlfox/veeramathi-amman` on GitHub. GitHub Pages serves it from `main` at
https://veeramathi.pearlfox.io (see `CNAME`), and it takes about a minute after a push. Both sites (`function-expenses/`
and `functions-dashboard/`) and the shared root files deploy together. After a push, verify by fetching the live URL
directly (e.g. `curl -s https://veeramathi.pearlfox.io/function-expenses/ | grep "v="`), not just by trusting the push.
(An older version of this note described a second mirror repo served at newmantech.in; that no longer applies.)

## 13. The title block's last row: செலவு + the receipt settings pill (app.js, receipt-settings.js, style.css)
Owner decision (permission given): the receipt-settings pill (a round gear and "Next 107") is the last item of `.title-actions`, right after
the செலவு button, built by `settingsPillHtml()` and added in `updateSheetTitle()`. Its look is the last block of `style.css`; it is sized to
match the other pills. It is NOT in the page header any more (an earlier version had a gear next to Logout; that was removed).
The click listener is on `document`, because the title is redrawn often and a listener on the button itself would be lost.

## 14. `#sheet-title` ignores taps on its empty strip while an income / expense view is open (expenses.css)
Owner decision (permission given): `body.view-income #sheet-title { pointer-events: none; }`, with `:is(button, a, input, select)` inside it
switched back on. The title box overhangs the first table row; without this it swallowed taps and swipes meant for row 1 (and kept the date
from opening on touch). The members ledger sheet has the same overhang and has NOT been changed: ask first.
