# Audit report: Accounts, Members, Dashboard

Date: 2026-11-15. Updated 2026-11-16 (see section 2a for what is fixed and what changed with the real member count of 82). Scope: `function-expenses/` (Accounts `index.html`, Members `members.html`) and `functions-dashboard/` (Dashboard), plus the shared root scripts, `supabase/schema.sql` and the Pages workflow.
Mode: read-only. No code was changed.

## 1. How this was done, and its limits

- Every JS file was read as a comment-stripped, line-numbered listing (about 2,500 code lines): `app.js`, `income.js`, `shared.js`, `scroll-compact.js`, `members.js`, `member-address.js`, `date-picker.js`, `print*.js`, and all Dashboard JS.
- The three HTML files (head, script loading), the CSS (font loading, containment, motion) and `schema.sql` (RLS, indexes) were also read.
- One measurement: a synthetic render benchmark in headless Chrome, using the real `style.css` and the real row templates. 300, 800 and 1500 rows, run once.
- NOT done: Lighthouse, real-device testing, a network waterfall, testing with real member data, or logging into the live site. The pages are login-gated and I cannot see screenshots. Anything that says "feels laggy on a phone" is a prediction from the code and the benchmark, not an observation.
- Real member count: 82 (confirmed 2026-11-16). The benchmark in section 3 was run at 300 to 1500 rows, so at your size the cost is far lower; see section 2a.

## 2. Summary

The code is in good shape for a no-build static site. Event delegation is used everywhere, scroll listeners are passive or rAF-throttled, the CDN scripts are pinned with SRI, user text goes through `escapeHtml`, saves are upserts with `onConflict`, and member insert is race-safe.

There are 4 findings I would fix first (section 4), because two of them can lose or misfile data:

| ID | Severity | Area | One line |
|----|----------|------|----------|
| H1 | High | Accounts | A ledger edit can be saved under the WRONG function if you switch pills within 0.7 s of typing |
| H2 | High | Accounts, Members | Edits typed in the last moments before closing the tab or navigating are lost (no flush on exit) |
| H3 | High | Accounts, Members | Member list is not paginated: silent cut-off at 1000 rows, and load errors are swallowed on Accounts |
| H4 | High (if rows > 300) | Accounts, Members | Every filter keystroke rebuilds the whole table; cost grows linearly with members |
| M1 | Medium | All | Fonts load through a CSS `@import` chain |
| M2 | Medium | All | The favicon and apple-touch-icon are blank images |
| M3 | Medium | Accounts, Members | Non-passive wheel and touchmove listeners stay on `window` for the whole session (Heart Logic) |
| M4 | Medium | Dashboard | Changing the santha amount does one request per ledger row, one after another |
| M5 | Medium | Dashboard | Everything is refetched with `select(*)` after each change, and nothing refreshes when Accounts changes data |
| M6 | Medium | Accounts | Initial load is 3 serial round trips; rapid pill clicks can show stale data |
| M7 | Medium | Database | RLS is `authenticated -> everything`; the Dashboard password is as powerful as the Accounts one |
| M8 | Medium | All | Accessibility gaps: unlabeled row inputs, no reduced-motion, thin date-picker keyboard support |
| M9 | Low-Medium | Accounts, Members | Collapse-measuring code flips `is-scrolled` to measure, forcing extra layouts (Heart Logic) |

Items marked (Heart Logic) must NOT be touched without your explicit OK. The others do not touch `HEART_LOGIC.md` items.

## 2a. Status after the 2026-11-16 round

With 82 members the size-driven findings drop in priority. The three timing and error findings were fixed (uncommitted at the time of writing; see the change list below).

| ID | Status | Notes |
|----|--------|-------|
| H1 wrong-function save | FIXED | `saveRow` takes the function id captured when the edit was made; pill clicks flush pending saves first. Verified: old code saved under function B, new code under function A. |
| H2 edits lost on exit | FIXED | `shared.js` `registerLeaveSaver` / `trackedSave`: pending saves start when the tab is hidden or the page unloads; a "Leave site?" prompt appears only while a save is in flight. Covers ledger, income/expense lines and the focused Members cell. |
| H3 load errors swallowed | FIXED | Accounts now shows an error for people and functions loads. |
| H3 1000-row cap | OPEN, low | 82 members is about 12 times under the cap. Reuse the Dashboard `fetchAll` if you ever pass roughly 800. |
| H4 table rebuild per keystroke | DOWNGRADED to Info | At 82 rows expect about 30 to 50 ms on a desktop and about 150 to 250 ms on a weak phone. Revisit only past about 300 members. |
| M3 non-passive wheel/touch listeners (Heart Logic) | DOWNGRADED to Low | Cost is small with a DOM this size. Leave the protected code alone. |
| M4 santha update loop | FIXED | `admin.js` now updates all paid rows of the function in ONE request and reports a failure ("paid entries were NOT recalculated, press Save again"). Verified with a fake database: 2 requests total instead of 61 for 60 paid rows, and the count shown is the real one. Not atomic with the function's own amount; a retry is safe. The `total = amount` overwrite (ignores `donation`) is unchanged on purpose: no screen writes donation. |
| M6 serial startup, stale pill response | FIXED | people and functions load together; a stale ledger response is ignored. |
| M1 fonts | FIXED | The Google Fonts `@import` is gone from both `style.css` files; each page `<head>` now has `preconnect` to fonts.googleapis.com and fonts.gstatic.com plus the font `<link>` before `style.css`, so the downloads run in parallel. Same families and weights (all of 400 to 800 are used somewhere, and fonts only download when used). Verified in headless Chrome against the pushed version: same faces loaded, identical header, h1, sheet and pill sizes. `style.css` `?v=20261116a` on all three pages. |
| Tamil text font (found while doing M1) | DECIDED: leave as is | Tried Noto Sans Tamil for ALL Tamil text so it looks the same on every device. It is about 28 percent wider than the Mac's built-in Tamil font (Tamil Sangam MN), which the fixed-px layout was built against. Result in headless Chrome: Accounts sticky title row wraps to 2 lines (96 px to 185 px tall), the receipt-number header goes to 3 lines (+25 px), the Home link and every toggle button grow 20 to 30 percent, and a 12-letter place name no longer fits the 121 px Members place box (108 px of text became 138 px). Even Noto's condensed width axis at 70 percent (hard to read) leaves the button row at 1095 px against 813 px today. Reverted. Doing it properly means a deliberate layout pass: wider Members columns and a re-flowed Accounts title row, which are Heart Logic items and need your explicit permission. Only the page title uses Noto Sans Tamil today. |
| M2 favicon, M5, M7, M8, M9, L-items | OPEN | Unchanged. |

Files changed in this round: `shared.js`, `app.js`, `income.js`, `members.js`, `functions-dashboard/admin.js`, and the `?v=20261116a` bump on the Accounts, Members and Dashboard `index.html` files. The wording of H1, H2 and H3 in section 4 below describes the problems as found, before the fix.

## 3. Measured: table render cost

Method: `/tmp/bench/bench.html`. It builds N rows with the same markup as the real row templates (Members: 8 cells, 6 inputs per row; Accounts: 7 cells, 5 inputs per row), sets `innerHTML`, then forces layout. Chrome headless on this Mac, `style.css` loaded.
The benchmark table did not get the `table-layout: fixed` class that the real tables use (my edit to add it failed), so real numbers may be somewhat better. The `contain: layout` wrappers were also not in the test. Treat these as an upper-ish bound.

| Rows | Page | DOM nodes | HTML parse | Layout | Full re-render |
|------|------|-----------|-----------|--------|----------------|
| 300 | Members | 6,011 | 26 ms | 190 ms | about 160 ms |
| 300 | Accounts | 4,811 | 5 ms | 112 ms | about 105 ms |
| 800 | Members | 16,011 | 51 ms | 360 ms | about 450 ms |
| 800 | Accounts | 12,811 | 15 ms | 290 ms | about 280 ms |
| 1500 | Members | 30,011 | 109 ms | 760 ms | about 870 ms |
| 1500 | Accounts | 24,011 | 26 ms | 500 ms | about 455 ms |

Reading it: string building is free (1 to 5 ms). Layout dominates, at roughly 0.4 to 0.5 ms per row. Under 100 ms feels instant, 100 to 200 ms is noticeable, over 300 ms feels laggy. On a mid-range phone, multiply by 3 to 5.
Every filter keystroke (after the 150 ms debounce) and every filter-cleared event does one of these full rebuilds. See H4.

At your 82 members, scaling the 300-row figures down linearly: Members about 45 ms, Accounts about 30 ms on this Mac. That is below the point where it is noticeable.

## 4. Findings

### H1. Ledger save can land on the wrong function (data integrity)

- Evidence: `app.js:520-523` (`saveRow` reads `selectedFunctionId` when it runs), `app.js:548-557` (the 700 ms debounce timer), `app.js:341-347` (the pill click changes `selectedFunctionId` and does not flush pending saves).
- Failure: tick a santha box or type a receipt, then within 0.7 s click a different function pill. The timer fires, `saveRow` runs with the NEW `selectedFunctionId`, and it upserts the old row's values (read from the now-detached `<tr>`) under the new function. A paid mark shows up in the wrong function's ledger, and the totals for both are wrong.
- Contrast: `income.js:148` already does it correctly ("captured now: the save still goes to this function").
- Fix: capture `funcId` in `scheduleSave` and pass it into `saveRow`; also call `flushPendingCellSaves()` (already exists, `app.js:478`) at the start of both pill click handlers, before changing the selection.
- Heart Logic: no. Effort: small. Same fix pattern for year pills (`app.js:332-339`).

### H2. Unsaved edits are lost when the page is closed or left

- Evidence: Accounts uses a 700 ms debounce (`SAVE_DEBOUNCE_MS`, `app.js:554`, `income.js:151`). Members saves on blur (`members.js:544-548`). There is no `pagehide`, `visibilitychange` or `beforeunload` handler anywhere (searched all JS).
- Failure: type a receipt number and immediately close the tab or press back; the text never saves. Same for Members: type in a cell and close the tab without leaving the cell. Mobile browsers killing a background tab are the worst case.
- Fix: on `visibilitychange` (hidden) and `pagehide`, flush pending ledger and income timers. For a fetch during unload, use `keepalive: true` or `navigator.sendBeacon` style; with supabase-js the realistic option is flushing on `visibilitychange` (fires before the page is killed in most cases) plus a `beforeunload` warning while a timer is pending.
- Heart Logic: no. Effort: small to medium.

### H3. Member list has no pagination, and load errors are swallowed

- Evidence: `app.js:250` and `members.js:155` call `.from("people").select("*")` with no `.range()`. Supabase's default response cap is 1000 rows. The Dashboard already knows this and pages with `fetchAll` (`data.js:14-23`).
- Failure: at 1001+ members, the Accounts sheet, the totals ("expected" is `rows * santha_amount`), the next S.No and the next Roll No. all silently use the first 1000. `computeNextMemberNo` could even hand out a number that already exists (the unique constraint would then reject the insert, so it fails loudly but confusingly).
- Related: `app.js:251` and `app.js:257` do `if (error) return;` with no message at all. If the network drops on load the page just looks empty.
- Fix: move `fetchAll` into a shared file and use it for people on Accounts and Members; show a status message on error.
- Heart Logic: no. Effort: small.

### H4. Whole-table rebuild on every filter change (scales with member count) - Info at 82 members

- Evidence: `renderRows()` in `members.js:117-151` and `renderSheet()` in `app.js:411-454` both replace the whole body `innerHTML`. Measured cost in section 3.
- Side effects of a full rebuild: input focus and caret are lost (you work around it by committing first, `members.js:379-385`), the address popup and the date popup are closed ("the table was redrawn under us", `date-picker.js:94`), and each rebuild throws away and recreates about 20 to 30 thousand nodes.
- Fix options, cheapest first:
  1. Keep the debounce but also skip the rebuild when the resulting list of ids is identical to what is already shown.
  2. Render all rows once and filter by toggling `hidden` on existing `<tr>`s; rebuild only when the data changes. Layout drops to a style recalc of the visible rows.
  3. `content-visibility: auto; contain-intrinsic-size: auto 44px` on `tbody tr` so off-screen rows are not laid out. Works in all current browsers. Needs a check against the sticky stack (Heart Logic area) before use.
- Heart Logic: JS rebuild logic is not listed; option 3 is CSS next to protected layout, so ask first.
- Priority depends on your real count: under 200 members nothing to do; 300+ worth doing; 800+ strongly recommended.

### M1. Fonts are loaded through CSS `@import`

- Evidence: `style.css:1` imports Google Fonts (Poppins 400/500/600/700/800 plus Noto Sans Tamil 700/800); `functions-dashboard/style.css:1` imports Inter 400 to 800. There is only a `preconnect` to `cdn.jsdelivr.net`, none to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Effect: the browser must download `style.css`, parse it, discover the `@import`, fetch the Google CSS, then fetch the font files. That is 3 sequential hops before text paints in the right font. `display=swap` helps the flash of invisible text but not the chain, and the layout shifts when the font arrives. The collapse measurements also re-run on `document.fonts.ready`.
- Fix: put `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` and the stylesheet `<link>` in each page `<head>`, and delete the `@import`. Check which weights are really used (800 on Poppins and Inter looks unused; verify with grep before trimming). Self-hosting the woff2 files would also remove a third-party dependency and work offline, at the cost of repo size.
- Heart Logic: no (but font metrics affect the fixed-px layout, so test after).

### M2. Favicon and apple-touch-icon are blank

- Evidence: `logo-emblem-only.png` is 143 bytes and fully transparent (found earlier when the header icon was invisible). Both Accounts and Members use it as `<link rel="icon">` and `apple-touch-icon` (`index.html:16-17`, `members.html:16-17`). The Dashboard `logo.png` (2.4 KB) was also blank.
- Effect: browser tab shows a generic page icon; saving to a phone home screen gives a blank tile.
- Fix: generate a real 32x32 favicon and 180x180 apple-touch-icon from the temple emblem (or the orange disc people icon already used in the Members header). I need a source image from you for the real emblem.

### M3. Non-passive wheel and touchmove listeners live forever (Heart Logic)

- Evidence: `scroll-compact.js` registers `wheel` and `touchmove` with `{ passive: false }` on `window`. After the first freeze, `freezeArmed` is false and the handlers return immediately, but the listeners still exist.
- Effect: a non-passive wheel/touchmove listener on `window` makes Chrome wait for the main thread before scrolling, on every event, for the rest of the session. On a page with 10k to 30k nodes (section 3), this is the classic cause of scroll jank on phones, even though the handler does nothing.
- Fix idea: add the listeners only while `freezeArmed` is true, and remove them in `beginFreeze`; re-add them in `rearmFreeze()` and in the wheel-up expand branch. Behavior stays the same.
- WARNING: Heart Logic. This is the protected scroll shrink/freeze code. Needs your explicit permission and a careful retest of freeze, wheel-up expand and touch.

### M4. Santha amount update is N sequential requests

- Evidence: `admin.js:121-123`: `for (const row of checkedRows) { await client.from("ledger_entries").update(...) }`. The result of each update is ignored, so a failure halfway is silent while the success banner still says "N existing entries recalculated".
- Effect: with 400 paid members that is 400 round trips in series (tens of seconds) and a possible half-updated state.
- Also: the update sets `total = newAmount`, which discards any `donation` on the row. The schema has a `donation` column and the comment says "a ledger row's total is just its head tax". Today no screen writes `donation`, so this is latent, but it is a trap if a donation field is ever added.
- Fix: one statement: `update({ santha: newAmount, total: newAmount }).eq("function_id", id).eq("santha_checked", true)` and check the single error. Even better, make the amount a database function so both updates are atomic.
- Heart Logic: no. Effort: small.

### M5. Dashboard data loading

- Evidence: `data.js:26-41` loads 6 tables with `select("*")`; `refreshAll()` repeats that after every admin change (`admin.js:71`, `admin.js:126`).
- Cost: `people` includes the `address` JSON for every member, which the Dashboard never shows; the `ledger_entries` and `income_entries` rows carry columns that are unused.
- Staleness: there is no polling, no realtime and no refresh button. If someone saves a payment on Accounts while the Dashboard is open, the Dashboard shows old numbers until a reload.
- Fix: select only the needed columns (people: `id,name,name_en,member_no,mobile,avoid`); update the single changed row locally instead of refetching everything; add a small "Refresh" button, or refetch on `visibilitychange` when the tab becomes visible.
- Heart Logic: no.

### M6. Accounts startup and navigation requests

- Evidence: `app.js:243-247` awaits `loadPeople()`, then `loadFunctions()`, then `loadLedgerEntries()` one after another. `people` and `functions` do not depend on each other.
- Effect: one extra network round trip on every page open (roughly 100 to 300 ms on mobile data).
- Race: `app.js:349-362` has no "latest request wins" guard. Click pill A then pill B quickly; if A's response arrives after B's, the sheet shows A's data under B's title.
- Fix: `Promise.all([loadPeople(), loadFunctions()])` then the ledger; add a request counter and ignore stale responses.
- Heart Logic: no.

### M7. Row Level Security is wide open to any logged-in user

- Evidence: `schema.sql`: `create policy "authenticated all ..." using (true) with check (true)` on `people`, `functions`, `ledger_entries`, `expense_entries`; full CRUD on `income_entries`; select-only on `materials`.
- Effect: the Dashboard login and the Accounts login are equally powerful. Anyone who has either password can read all member phone numbers, birth dates and addresses, and edit or delete anything, including `delete from people` (which cascades to every ledger row). The Dashboard's "type the password again within 5 minutes" gate (`app.js:13-18`) is client-side only; it is a convenience, not a security boundary.
- Not a leak of secrets: the publishable anon key in `supabase-config.js` is meant to be public, and git history contains no CSV or backup files (checked).
- Suggestions (ask first, DB change): make the Dashboard user read-only through policies keyed on the user email; consider disallowing `delete` on `people` for the app roles (use `avoid = true` which the app already supports); add an index on `ledger_entries(person_id)` for the cascade delete.
- Heart Logic: no. Needs a Supabase SQL change by you or with your OK.

### M8. Accessibility

- Row inputs have no accessible name. In both tables the header lives in a separate `<table>` (the scrolling split), so `<input class="cell-input">`, `.f-receipt`, `.f-paid`, `.f-santha-check` and `.avoid-check` are read by a screen reader as just "edit text". Add `aria-label` when rendering, e.g. `aria-label="Mobile, ${name}"`.
- Status messages: `members-status` has `aria-live`; the Accounts `sheet-status` and `income-status` do not (`index.html` only has it on the gate), so "Error saving row" is silent to screen readers.
- No `prefers-reduced-motion` rule exists in any CSS file (searched). The scale animations, row blink and popup transitions always play.
- Custom date picker (`date-picker.js`): `role="dialog"` but no focus move into it, no arrow-key movement between days (42 tab stops), no focus return on close. It is desktop only, so touch users are unaffected; keyboard users can still type the date.
- Native `confirm()` is used 5 times (sign-out, avoid toggle, cancel edit, delete row, etc.). Works and is accessible, but looks off-brand; a styled confirm is a nice-to-have.
- Contrast was not measured.

### M9. Collapse measuring flips layout state (Heart Logic)

- Evidence: `app.js:206-212` adds and removes `is-scrolled` on `<body>` to measure `scrolledHeight`, inside callbacks wired to `resize`, `load`, `fonts.ready`, a MutationObserver on the sheet title (subtree, characterData) and a ResizeObserver (`app.js:214-237`). `members.js:59-69` does the same for the filter card without the class flip.
- Effect: each call forces a style recalc and layout twice. With a small DOM it is invisible; with a 20k-node table it can cost tens of ms per call, and a ResizeObserver whose callback changes the observed element's size can trigger "ResizeObserver loop" warnings.
- Fix idea: cache the measured heights and only re-measure on width change or font load, or measure with a hidden clone. Low urgency.
- WARNING: Heart Logic (`syncPillsCardCollapse` and the sheet-title collapse). Do not touch without explicit permission.

### Low and informational

- L1. File size policy: `style.css` is 1,380 lines and 67 KB (limit 600). It could be split into base, header and sticky stack, tables, forms and popups. Many comments are valuable (Heart Logic notes); keep them. Split only with a cache-buster bump on every page, and the sticky stack must stay in one piece.
- L2. Duplicates: `syncPillsCardCollapse` is written twice (`members.js:59-69`, `app.js`); `fetchAll`-style loading would live in one place after H3; `members.js` registers two document-level click listeners (`:366` and `:557`) that both run on every click.
- L3. Cache-buster drift: the same file has different `?v=` values on different pages (`supabase-config.js` 20261105t vs 20261105s, `income-categories.js` 20261105t vs 20261105s), so the browser downloads it twice. GitHub Pages sends `cache-control: max-age=600`, so a visitor may see up to 10 minutes of old HTML with new JS; keep deploys backwards compatible.
- L4. Header/body horizontal scroll sync (`app.js:469`, `members.js:42`) sets `scrollLeft` directly in the scroll handler; the header can lag the body by a frame on phones. Wrapping in `requestAnimationFrame` smooths it.
- L5. Dashboard charts: Chart.js (about 200 KB) is fetched on the login screen, and all 4 Overview charts are destroyed and recreated on every tab switch (`overview.js:30-79`, `charts.js:6-13`). Consider a "data changed" flag so charts rebuild only when data changed, and loading Chart.js lazily after unlock.
- L6. Deployment scope: the workflow publishes the whole repo root (`pages.yml`, `path: '.'`), so `HEART_LOGIC.md`, `_transliterate_names.mjs`, `_nocache_server.py`, `scripts/` and the invitation PDF are all public on the site. No secrets are in them (the invitation PDF may be intentional). Optional: publish only the three site folders.
- L7. Indexes: `ledger_entries` is covered by `unique (function_id, person_id)`. No index on `ledger_entries(person_id)` or `materials(function_id)`. Harmless at this size.
- L8. No Content-Security-Policy. SRI on CDN scripts is good. A CSP meta (script-src self + jsdelivr, connect-src the Supabase URL, font-src/style-src Google) would limit XSS blast radius; needs testing because of inline styles.
- L9. `lang="ta"` on Accounts while most UI text is English; screen readers will read English with a Tamil voice. Consider `lang="en"` with `lang="ta"` on Tamil spans.
- L10. Address popup and date picker re-read layout on every `scroll` event (`member-address.js:299`, `date-picker.js:189`). The date picker exits early when closed; the address popup too. Not a problem today.

## 5. What is already good (keep)

- Event delegation on tbody and containers (no per-row listeners, no leaks seen).
- Debounced filters (150 ms) and saves (700 ms); `ROW_*` blink timers all cleared or self-contained.
- All scroll listeners are passive except the intentional Heart Logic freeze; scroll-driven state is rAF-throttled.
- `escapeHtml` is used on every user-supplied string put in `innerHTML`; unescaped values are UUIDs, numbers or constants.
- Pinned supabase-js 2.116.0 and Chart.js 4.4.6 with SRI hashes.
- Members edit mode: snapshot and undo, uniqueness checks on name and mobile validation, `insertPersonRaceSafe`.
- Dashboard: paginated `fetchAll`, per-function summaries computed from in-memory arrays (cheap at this scale), good empty states.
- Income rows capture their function id at input time (the right pattern; Accounts should copy it, H1).
- No emoji or blocking third-party tags; only two CDNs.

## 6. Suggested order of work (updated)

Done: H1, H2, H3 errors, M4, M6.

1. M2: a real favicon (needs your emblem image, or a stand-in from the orange people icon). M1 is done.
2. M8: row-input `aria-label`s, `aria-live` on the Accounts status lines, `prefers-reduced-motion`.
3. M7: decide whether the Dashboard login should be read-only (database policy change).
4. M5: Dashboard column selection and a refresh on tab focus.
5. L-items (cache-buster drift, duplicate `syncPillsCardCollapse`, `style.css` split) as time allows.
6. M3 and M9 only with your explicit Heart Logic permission, and probably not needed at 82 members.

Every item above that changes a CSS/JS file needs the `?v=` bump on every page that loads it.

## 7. Questions for you

1. Is the Dashboard password meant to be read-only? (decides M7)
2. Do you have the real emblem image for the favicon (M2)?
3. Should the fixes from 2026-11-16 be committed and pushed?

(Answered: 82 members now.)
