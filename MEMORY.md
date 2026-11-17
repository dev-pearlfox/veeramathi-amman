# Memory: Sri Veeramathi Amman Thunai

Durable project memory: decisions and why, lessons learned, repo state, and what was and was not verified. Read this
first in a new session. Open work lives in [TASKS.md](./TASKS.md); standing rules in [RULES.md](./RULES.md).
Last updated after commit `202c4b8` plus the mobile column and auto-fill (this commit).

---

## 1. People and context

- **Owner**: Manvi (PearlFox). Works one small request at a time, often about phone layout, and says "commit and push"
  or "yes" when ready.
- **Users**: a temple society (clerk, treasurer, office-bearers). Data is Tamil. 82 members as of 2026-11-16.
- **Festival**: தை திருவிழா, in Thai month. The invitation printed in a given year is for the festival of the
  **next** year (2026 accounts, January 2027 festival).
- **Hosting**: public repo `dev-pearlfox/veeramathi-amman`, branch `main`, GitHub Pages, domain
  `veeramathi.pearlfox.io`.

## 2. Decisions and why

| Decision | Why |
|---|---|
| Two static sites, one Supabase DB, no build | Cheap, nothing to host or maintain, easy for the owner to open and check |
| Two separate logins (Accounts, Dashboard) with separate session keys | The clerk who enters data should not see or change the Dashboard's admin tools |
| Dashboard is **not** read-only (audit M7) | Its Admin tab adds functions, sets the head-tax price and changes passwords |
| RLS: any signed-in user reads and writes | Simple; the separation is in the pages, not the database |
| வரவு / செலவு tables use a pinned header table plus a body table with identical literal-px `<col>` widths | A single table with a sticky `th` cannot pin under the stack and scroll sideways. The shared width function keeps them aligned |
| Date tap on touch calls `showPicker()` | The custom calendar is desktop only; phones need their own picker |
| Receipt is a picture, sent through the device's share sheet; the laptop copies it and opens the chat | A WhatsApp link cannot attach a picture. The owner declined a paid messaging service, so this is the chosen route |
| Receipt numbering counter in `localStorage`, per device | No database change needed. A second device must be set up separately |
| Receipt folder via File System Access API (laptop Chrome / Edge only) | Lets the laptop file receipts automatically. Chrome refuses Downloads itself, so the user makes a "Receipt" folder inside it. Other devices fall back to a download |
| Receipt file name `<no>_தலைக்கட்டு_இரசீது_<full name>.png` | Owner chose the Tamil word இரசீது over "rasithu". Empty number is left out |
| The settings gear lives in the title block as a pill after செலவு ("Next 107"), not in the page header | Owner's request: next to the செலவு tab, round gear inside the pill, with the next receipt number |
| Invitation page 9 x 12 in, sheet 18 x 12 in, imposed 12\|1, 2\|11, 10\|3, 4\|9, 8\|5, 6\|7 | Matches the print shop's PDF |
| Booklet print stays black and white; WhatsApp is colour; **Rich festive** is an extra WhatsApp option | Owner wanted a modern colour version for WhatsApp but the print shop copy unchanged |
| Rich festive tints ornaments with pre-made PNGs, not CSS or SVG filters | Filters drew faint boxes around the ornaments in the real PDF |
| Cover: Ganesha left, Amma centre, Murugan right | Owner supplied the two pictures. Amma is cropped from the old cover art |
| Carry-forward (முந்தைய இருப்பு) counts only when one year is selected | Across years it would count the same rupees twice |
| Tamil text left on the device font | Noto Sans Tamil is 28 percent wider and broke the fixed-px layout |
| Donation tabs get a mobile column; exact member name copies the member's mobile (replacing a typed one), once, no link | Owner's choice among three options. A link would need a database change. Exact match only, so a shortened name will not match |
| Income total labels: carry-forward, உண்டியல் and பௌர்ணமி say "மொத்தம்" | Owner's choice; other tabs pending |

## 3. Lessons learned

- **Measure, then look.** Layout claims were checked with `getBoundingClientRect` in headless Chrome, then a
  screenshot. "Looks fine" without measuring has been wrong before.
- **Real PDF output differs from screen.** A colour filter looked right on screen and drew boxes in the real PDF.
  Test the real output path.
- **A stale cached script can blank a page.** Bump `?v=` everywhere, every time.
- **An invisible overhang eats taps.** `#sheet-title` overhung row 1 and swallowed taps and swipes (fixed with
  `pointer-events: none`; controls inside re-enabled). The members ledger sheet has the same overhang, left alone
  pending permission.
- **Headless `printToPDF` of the full dashboard hangs** (also for the existing Normal mode), so a PDF of the whole
  booklet has not been produced in tests. A small page with the same styles exports fine.
- **Do not guess when an attachment is missing.** Ask for typed numbers.
- **Process**: killing leftover servers and Chrome processes after tests avoids port clashes; use a unique debug port
  per run; load screenshots in a separate step from the one that creates them.

## 4. Repo state

Latest commits on `main`:

| Commit | What |
|---|---|
| `c9462fc`, `a451131`, `16b1456` | Invitation preview (pinch to zoom, Edit Mode banner) and related work |
| `01593ca` | Receipt box |
| `4962390` | Accounts: settings pill, receipt numbering, folder, file names, row 1 fix, "மொத்தம்" label |
| `202c4b8` | Invitation: Ganesha / Murugan cover, Rich festive option (also `amman_2.png`) |

Deployed through `pages.yml`; the last run succeeded and the new files were fetched live.

## 5. What was and was not verified

**Verified** (headless Chrome, stripped copy, fake Supabase; JS `node --check`):
- Settings pill layout at 360, 390, 430 and 1280 px; same row and same height as செலவு; no sideways overflow.
- Numbering flow: set 107, tick fills 107, pill shows 108, survives switching tabs, Turn off resets it.
- Receipt folder: all four actions file the picture (with an OPFS stand-in for the folder picker), the no-folder and
  denied-permission and unsupported paths.
- Receipt file-name rule (in node only).
- Invitation: 12 pages in Normal and Rich festive through the real print button flow; the Normal mode has no
  festive class; a small test page printed to a real PDF with clean ornaments.

**Not verified**: a real phone or tablet, a real database save of the new features, real printing, a real WhatsApp
PDF, the real folder picker, a duplicate-number guard (does not exist), a full-booklet PDF. See TASKS.md section 1.

## 6. Test tooling (not in the repo)

Scripts used in `/tmp` (lost on restart; rebuild as needed): a fake-Supabase copy of the Accounts page served on a
local port; a script that builds a fake-data copy of the whole project for the Dashboard; CDP scripts that open the
page, click the real buttons, measure and screenshot. Chrome is at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

## 7. Things not to do

- Do not touch the Heart Logic items without the warning and permission.
- Do not rename `income-categories.js` keys.
- Do not suggest a paid WhatsApp messaging service again; the owner declined it.
- Do not store or ask for passwords, and do not touch the owner's database.
- Do not commit without being asked.
