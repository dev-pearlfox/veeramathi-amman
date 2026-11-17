# Rules: Sri Veeramathi Amman Thunai

How we work on this repo. These apply to every contributor, human or AI agent. Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit).
Hard rules first (breaking one needs the owner's explicit say-so), then conventions.

Companion docs: [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN.md](./DESIGN.md),
[TASKS.md](./TASKS.md), [MEMORY.md](./MEMORY.md).

---

## Hard rules

1. **Heart Logic is protected.** The items in
   [function-expenses/HEART_LOGIC.md](./function-expenses/HEART_LOGIC.md) (the `.sticky-top-stack`, `transform:
   scale()` rules, fixed-px widths, `syncPillsCardCollapse`, SRI hashes, the title block) must not change without
   first saying "Warning: Heart Logic" and getting explicit permission. Each rule came from a real, measured bug;
   something that "looks simpler" brings the bug back. The Dashboard is not covered.
2. **Bump the cache-buster.** Every CSS / JS file is loaded as `file?v=YYYYMMDDx`. Change a file, bump its `?v=` on
   **every page** that loads it. A stale cached script once left a page showing only its header.
3. **Never rename keys in `income-categories.js`.** Keys are stored in `income_entries.kind`. Labels can change.
4. **Passwords.** Never ask for, store, log or write a password. Never touch the owner's database. SQL changes are
   given to the owner to run in Supabase.
5. **Do not commit or push unless asked.** Ask first when the work is ready. List what is uncommitted.
6. **CDN scripts keep their SRI hash.** Bumping a pinned version means regenerating the hash (command in
   HEART_LOGIC.md #11).
7. **No secrets in the repo.** The `backups/` folder (names and phone numbers) stays git-ignored.
8. **No emojis** in code, commit messages, docs or replies.

## Working with the owner

- Requests come one small step at a time, often about phone layout. Do exactly that step.
- If a request is ambiguous, ask a short question before building.
- If asked for an explanation, explain in plain words first; do not change code.
- Report in plain language: what changed, what was tested, what was **not** tested, what is uncommitted.
- Say clearly when a check was only a simulation (headless Chrome with a fake database) and not a real device.
- When an image attachment does not arrive, say so and ask for typed numbers. Do not guess.
- Do not bring back an option the owner has declined (see MEMORY.md, "Decisions").

## Conventions

### Code
- **No build step.** Plain HTML, CSS, JS. Keep it that way.
- **One copy of anything shared.** Business rules and lists used by both sites live at the repo root
  (`function-rules.js`, `income-categories.js`, `expense-lines.js`, `money-format.js`). DRY, YAGNI, SOLID.
- **Keep files under 600 lines.** Split when a file grows past it and the pieces are cohesive; do not split just to
  hit a number.
- **Comments say why.** A rule that came from a bug gets a comment where the code is, and an entry in HEART_LOGIC.md
  if it is protected.
- **Prefer small diffs** to rewrites.
- **Zen of Python** applies in any language: simple, explicit, flat.
- Edit with care on macOS: BSD `sed` needs `sed -i ''`. A small Python script is safer for multi-line edits.

### UI
- Match the site: cream surface, orange accent, Poppins, 16 px radius (DESIGN.md).
- Mobile first; check 360, 390 and 430 px wide and a laptop width.
- Tables use literal px column widths. Header and body tables must share the exact same widths.

### Verifying a change
1. `node --check` on every changed JS file.
2. Measure layout in headless Chrome against a stripped copy with a fake Supabase (pages are login-gated). Measure
   first, then look at the screenshot.
3. Check the behaviour, not just the look (tick, save, redraw after switching tabs).
4. After a push: `sleep 40; gh run list --limit 1`, then `curl` the live file.
5. Say what was not covered: real phone, real database save, real print dialog.

### Commits
- Imperative, specific subject. Group by area: one commit for Accounts, one for the Invitation.
- Branch is `main`; GitHub Pages deploys it.

### Docs
- When a feature or a decision changes, update MEMORY.md; when something opens or closes, update TASKS.md.
- Update HEART_LOGIC.md only with the owner's permission and only for protected code.
