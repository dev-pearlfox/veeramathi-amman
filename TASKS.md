# Tasks: Sri Veeramathi Amman Thunai

The single backlog. Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit). Context and reasons live in [MEMORY.md](./MEMORY.md); product
intent in [PRD.md](./PRD.md); working rules in [RULES.md](./RULES.md).

Legend: `[x]` done, `[ ]` open. **P1** = do soon, **P2** = worthwhile, **P3** = nice to have. Priorities are the
assistant's judgement, not the owner's; reorder freely. Items marked **(owner)** need a decision or an action only
the owner can take. Items marked **(device)** need a real phone, tablet or laptop.

---

## 1. Checks on real devices (device)

Everything below was only tested in headless Chrome with a fake database.

- [ ] **P1** Receipt settings pill: open it on a real phone, set a number, tick a member, confirm the number lands in
  the receipt field and the row saves to the real database.
- [ ] **P1** Row 1 tap / swipe fix (`#sheet-title { pointer-events: none }` on the வரவு / செலவு view): confirm on a real
  phone that row 1 can be tapped, the date opens, and the sideways swipe works.
- [ ] **P1** Real WhatsApp PDF from **Rich festive**: print to PDF from the Dashboard, open it in WhatsApp on a phone.
  The full-dashboard "Save as PDF" hangs in the headless test; only a small test page exported cleanly.
- [ ] **P2** Receipt WhatsApp share on the tablet; Ctrl+V into WhatsApp Web on the laptop.
- [ ] **P2** Receipt folder: the real `showDirectoryPicker`, and whether Chrome re-asks permission after a reopen
  (tested only with a stand-in).
- [ ] **P2** Tamil text in the receipt picture; real printing of the receipt (A5).
- [ ] **P2** Pinch to zoom in the Invitation preview on iPhone Safari.
- [ ] **P2** Header swipe on the வரவு / செலவு tables.
- [ ] **P3** Tamil file names (`111_தலைக்கட்டு_இரசீது_Ramesh_Kumar.png`) in older tools. Offer English words if a tool
  misreads them.

## 2. Questions for the owner (owner)

- [ ] **P2** Which invitation pages should get the Rich festive look, and should the page size change? Assumed: all
  pages, 9 x 12 in kept.
- [ ] **P2** Ganesha and Murugan on the cover are 1.7 in tall. Bigger?
- [ ] **P2** The originals of the Ganesha and Murugan pictures (2.5 MB each) were removed from the project. Copies are
  in `/tmp/lr/originals/` on the dev machine, which may be cleared. Keep them somewhere permanent?
- [ ] **P2** Fix the same invisible-strip overhang on the தலைக்கட்டு sheet's first row? It is Heart Logic and needs
  fresh permission. Which tab is the "first tab" that works?
- [ ] **P2** Add a duplicate receipt number guard?
- [ ] **P2** Should the other income tabs also say just "மொத்தம்"? (carry-forward, உண்டியல், பௌர்ணமி already do.)
- [ ] **P2** Widths for திருப்பணி நன்கொடை and நன்கொடை: the owner's images did not arrive. Typed numbers please. And was
  பௌர்ணமி / முடி காணிக்கை meant to take the same widths as முந்தைய இருப்பு?
- [ ] **P3** Blue focus ring on a tapped income pill: hide it or make it orange?
- [ ] **P2** Page 10 (gifts in kind): the Tamil transcription needs proofreading. "கிரீடம்" and "ஓசூர்" were changed
  without being asked.
- [ ] **P2** Is "4.31" a typo for 4.30? Are the phone numbers and the Thai 2 date rule for 2027 to 2029 right?
- [ ] **P2** Were the names SQL run and PDF rows 66 and 70 typed in?
- [ ] **P3** Is the green outline on the Invitation edit page wanted? Does pull-to-refresh blocking work on a real
  phone? Does the toolbar wrap acceptably at phone width?
- [ ] **P3** The WhatsApp link preview is cached for the old address (the `?v=2` link works). Nothing to fix in code.
- [ ] **P3** The invitation cover reported a corner overlap at one test width. Not examined.
- [ ] **P3** Real emblem image for the favicon and the two placeholder logos (`functions-dashboard/logo.png`,
  `logo-emblem-only.png`) (AUDIT M2).

## 3. Housekeeping

- [ ] **P2** Donation tabs: mobile auto-fill matches exact names only, and the mobile shows without the space grouping
  (98765 43210) that the Members page uses, because `income.js` re-reads the box after formatting. Check with real
  member names on a real device. If it rarely matches, add suggestions as you type. (device)

- [ ] **P2** `function-expenses/receipt-art.js` has a stale comment naming `invitation/cover-art-color.jpg`, which was
  deleted when the cover was redone. The picture is embedded as a data URL, so nothing breaks. Fix the comment
  (bump `?v=` when doing it).
- [ ] **P2** `function-expenses/amman_2.png` (2.2 MB) is committed but no page uses it. Remove it if it is not wanted.
- [ ] **P3** Cache-buster drift: files carry many different `?v=` values. Harmless, but untidy.
- [ ] **P3** `syncPillsCardCollapse` exists twice (Heart Logic: ask first).
- [ ] **P3** No Content Security Policy. `lang="ta"` is not set on every page.
- [ ] **P3** HEART_LOGIC.md #12 still says "GitHub account to be decided". The repo is `dev-pearlfox/veeramathi-amman`.
- [ ] **P3** Audit leftovers: M8 date-picker keyboard navigation and an optional styled confirm; M3 and M9 only with
  Heart Logic permission, and probably not needed at 82 members.
- [ ] **P3** Members list has no pagination (cap is 1000 rows; 82 members today). Reuse the Dashboard `fetchAll` if the
  list passes about 800.

## 4. Done (recent)

- [x] Receipt box, WhatsApp / Print / Save image / SMS (`01593ca`).
- [x] Receipt numbering ("Next 107" pill after செலவு), receipt folder, receipt file names (`4962390`).
- [x] Row 1 tap fix on the வரவு / செலவு view (`4962390`).
- [x] உண்டியல் total label "மொத்தம்" (`4962390`).
- [x] Invitation cover with Ganesha and Murugan, grey in the booklet, colour for WhatsApp (`202c4b8`).
- [x] WhatsApp **Rich festive** option (`202c4b8`).
- [x] Invitation preview: pinch to zoom, red "Edit Mode" banner (`c9462fc` to `16b1456`).
- [x] Audit H1, H2, H3 (errors), M1, M4, M5, M6 (see AUDIT_REPORT.md section 2a).
