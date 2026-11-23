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
screens. (Now 9 columns, 1566px in total: S.No 70, Roll 76, பெயர் 440, English Name 210, Home Address 190,
Postal Address 190, Mobile 170, பிறந்த தேதி 140, Avoid 80. With the owner's permission the English Name column,
once removed, came back and the Postal Address column was added; Home Address is the old ஊர் column renamed (it was called Member Origin for a while).
The table is drawn 1567px wide (the collapsed outer border adds 1px), so the header frame and the pill row are 1569px (1567 + 2px frame border); at 1568 the table overflowed its frame by 1px and scrolled sideways for nothing. Because that is wider than the usual 1320px container, `members.html`
has `<body class="is-compact page-members">` and `body.page-members main, body.page-members .sticky-top-inner`
are both `max-width: 1601px` (1569 + 2 x 16px padding; kept EQUAL, see #6). Narrower screens scroll the table sideways inside its frame as
before. The nth-child rules were renumbered to match.) A percentage-based stretch version was built and tested, then
explicitly reverted.
On the Donors (Others) tab only (`body.group-others`, set by members.js `renderGroupPills`; the owner chose to shrink the whole table) the
பிறந்த தேதி and Avoid columns are hidden (`display: none`, so nth-child numbers do not shift) and the table is 1346px (the other seven
columns keep their own widths), the header frame and pill row 1349px, the page max-width 1381px. **The Roll No. column is shown on Donors**
(owner's permission, 22 Nov: it holds D1, D2 ...; it used to be hidden and the table was 1270px / 1273px / 1305px). Switching to Donors clears
the birth date filter box (a hidden filter must not silently hide people), and the printout leaves those two columns off.

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
filter card now holds only the Print button. (Later, with the owner's permission, it also holds two list buttons, தலைக்கட்டு and
Others, `#group-pills`, at the left: the card is a flex row, the buttons use the Print button's own 32px height so the card is NOT
taller, and on phones (max-width 480px) they are tightened so all three still share one row. Checked: card 66px / stack height
identical with and without the buttons at 1700, 1280 and 700px.) The `.members-filter-card` scroll
shrink (item on `syncPillsCardCollapse`) still applies to that card. The
`.pill-row` rules on index.html are unchanged. (The வருடம்/விழா rows were later merged by the owner into ONE row of
"function (year)" pills, oldest year first; the shrink scale, `syncSheetFilterCardCollapse` and the sticky stack were left as they were.)

## 9b. Two member lists: தலைக்கட்டு and Others (`people.member_group`)
Roll Number (see shared.js) is given ONLY to தலைக்கட்டு members; an Others member (shown as **Donors**) is inserted with `roll_number: null`, which
`insertPersonRaceSafe` keeps as null (only a MISSING `roll_number` key means "give the next one"). A donor has a Roll No. of its own, **D1, D2 ...**:
the number `people.donor_no` (unique; `backups/donor-numbers.sql`), shown with a "D" by `rollText()` (shared.js) and given by `insertPersonRaceSafe`
(highest + 1, retried only when a NUMBER collided). No two people may share a name or a Roll No.: the database refuses it (`people_name_unique`, `people_name_en_unique` for a person with
no Tamil name, `people_donor_no_unique`) and members.js checks names first for a friendlier message (`findNameOwner`, `personSaveError`).
**A mobile number MAY be shared** (owner's decision, 22 Nov: relatives use one phone; 7 numbers already repeat); there is no rule on it. S.No. is counted inside each list
(`computeNextMemberNo(list, group, family)`). A row without `member_group` (a database that has not run `backups/add-member-groups.sql` yet) counts as தலைக்கட்டு. Roll Number stays
off every function's Ledger Sheet. **Others are on the Accounts page and the Dashboard too** (owner's decision, 22 Nov): they are listed
after the தலைக்கட்டு members so a payment can be recorded, but only a தலைக்கட்டு member OWES the head tax. A தலைக்கட்டு member
should pay; an Others member pays only if they wish to. `owesSantha(p, paid)` in the root `function-rules.js` is the one rule
(it uses `isThalaikattu` from `member-order.js`): the Dashboard's `santhaStatus` counts an Others member only once their head-tax box is
ticked, so they never appear in the unpaid list or the pending total. The invitation lists whoever paid (head tax, donation or gift),
so an Others member appears there only after paying; their table starts after the தலைக்கட்டு tables (S.No. counts from 1 again).
On the Members page they have no Roll No., birth date or Avoid column.
**`people.name` (பெயர்) may be empty for an Others member who has an English name** (the 62 people imported from the English pages of
the address PDF have only English names). `name` is nullable, unique when given (NULLs never clash), and the check `people_has_a_name`
needs `name` or `name_en`. A thalaikattu member always has a பெயர். Use `displayName(p)` (shared.js) wherever a name is shown as text,
and never call `.name.trim()` on a person without `?? ""`. Not movable between தலைக்கட்டு and Others (owner's decision).

## 9c. Family tables inside தலைக்கட்டு (`people.family_group`)
The தலைக்கட்டு list is split into family tables like the printed booklet (2026: 15, 17, 9, 1, 4, 4, 7 and 25 members). Each
member has `family_group` (1, 2, 3 ...) and **S.No. (`member_no`) restarts at 1 inside every table**, so S.No. alone no longer
identifies anyone: Roll No. does. The database keeps `(member_group, coalesce(family_group, 0), member_no)` unique
(`people_family_no_unique`). The ONE sort order is `compareMembers` in the root `member-order.js` (தலைக்கட்டு, then table, then
S.No., then name); the Accounts page, Dashboard, unpaid list and invitation all use it, so do not write a second `member_no` sort.
The Members page stays ONE table: above the first row of each later family table sits an orange strip row
(`tr.family-strip`, one `colspan="9"` cell, "Table 2 - 17 members"; it has no `data-person`, so code that works on member rows
never touches it, and it is never the first row, so the fixed column widths of #7 do not move). **The first table showing gets its
bar as the body table's `<caption id="members-caption">`, NOT as a row**: `table.sheet` is `table-layout: fixed`, which reads the
column widths from the first row, and a full-width first row collapsed every column to about 174px (tested). Never make a bar the
first row. The caption follows the filters (the first table that is showing) and is hidden on Others. The "Add to" picker row
(`#new-member-table-row`) is in the `tfoot` AFTER the add row, because the add row must stay the first row that gives the table
its widths. The invitation draws a real gap row (`inv-gap`, `INV.tableGap`) and restarts its own S.No. per table; the page
flow counts that gap, so change both together. Moving a member between tables is not built (not needed yet).

Also on the Members page: the round **T1, T2 ...** buttons (`#table-jump`, members.js `renderTableJump`) are a direct child of `<body>`
on purpose, because a `position: fixed` element inside a `transform: scale()` wrapper would not stay fixed to the screen. A click
scrolls to that table under the sticky header and blinks its rows once.

## 9d. Hover zoom on every button (`../button-zoom.css`)
One shared file, loaded by Accounts, Members and Dashboard. It uses the CSS `scale` property (not `transform`), so it composes with
buttons that already use `transform` and never changes layout, so the sticky/collapse maths of #1 to #6 is not affected. Its
`transition` is `!important` on purpose (older per-button rules set their own shorthand, which would drop `scale`). The T1, T2 ...
buttons are excluded (they have their own zoom in style.css).

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
