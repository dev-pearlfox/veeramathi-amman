# Design: Sri Veeramathi Amman Thunai

The visual and interaction language. The source of truth for the tokens is the `:root` block at the top of
`function-expenses/style.css` (Accounts) and `functions-dashboard/style.css` (Dashboard); this file explains them and
records the rules around them. Status as of commit `202c4b8` plus the mobile column and auto-fill (this commit). See also [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Principles

1. **Modern, warm, calm.** Cream surfaces, an orange accent, soft shadows, rounded corners. New UI must look like it
   belongs: copy an existing control before inventing one.
2. **Phone first.** Many users are on a phone or tablet. Tap targets are big; nothing makes the page scroll sideways.
3. **Tables are spreadsheets.** Fixed pixel column widths, a pinned header, rows that scroll under it.
4. **No surprises.** Nothing is sent or saved by a stray tap (the receipt box never sends by itself; the notes popup
   writes only on Save).
5. **Plain Tamil first.** Labels are Tamil where the users read Tamil; English only for small utility labels.

## 2. Colour (Accounts)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fff8f1` | Page background |
| `--surface` | `#ffffff` | Cards, odd rows |
| `--surface-2` | `#fff2e4` | Even rows, headers |
| `--text` | `#2a1a10` | Body text |
| `--muted` | `#8a6f5c` | Secondary text |
| `--border` | `#f2ddc7` | Lines |
| `--accent` | `#ea580c` | Orange: buttons, active pill |
| `--accent-2` | `#dc2626` | End of the accent gradient |
| `--accent-soft` | `#ffe8d4` | Resting pill fill |
| `--accent-text` | `#ffffff` | Text on accent |
| `--credit` | `#15803d` | Money in |
| `--expense` | `#b91c1c` | Money out |
| `--radius` | `16px` | Cards and pills |

The header is an orange to red gradient with white text. The Dashboard uses the same family.

## 3. Type

- **Poppins** for Latin letters and numbers; falls back to the system font.
- **Tamil** uses the device's own Tamil font in most places; a few places use Noto Sans Tamil (the receipt picture,
  the invitation). Noto Sans Tamil is about 28 percent wider than the Mac's built-in Tamil font, so switching all
  Tamil text to it broke the fixed-px layout and was reverted (AUDIT_REPORT.md).
- Fonts are loaded by `<link>` with `preconnect` in each page `<head>`, never by CSS `@import`.

## 4. Components

- **Pills** (`.members-toggle`): rounded buttons for functions and tabs. Active = orange gradient with white text;
  resting = soft cream with a faint shadow. In the title block they are enlarged (font 1.1rem, padding 9px 20px)
  because the title block is drawn at 0.7 scale.
- **Title block**: the title, a "Print / save as PDF" pill at the right, then a line `வரவு:` with the members tab and
  the income tabs, then a line with செலவு and the **settings pill**.
- **Settings pill**: a round white gear inside the pill, then "Next 107" (or "Next -" when numbering is off). Same
  height as the other pills.
- **Receipt / settings dialog** (`receipt.css`): a centred card on a dim backdrop; primary button orange, secondary
  buttons outlined; a status line under the fields (red for errors).
- **Tables**: header cell cream, rows alternate `--surface` / `--surface-2`, column filters under the header. Numbers
  right-aligned. Totals row in bold.
- **Sticky stack**: header, filter card and table header are ONE sticky block (Heart Logic).

## 5. Layout rules (protected)

The pinned header, the scale-based shrink, fixed-px column widths and the two-table design are listed in
[function-expenses/HEART_LOGIC.md](./function-expenses/HEART_LOGIC.md). Do not change them without asking. Widths in
use: members table 1176 px in 7 columns; ledger sheet 1070 px; income and expense tables use the `colWidths` of each
kind in `income-categories.js`.

## 6. Motion

Short transitions (about 0.15 s) on hover and focus. The header shrink uses `transform: scale()` only. `prefers-
reduced-motion` turns the row blink animations off.

## 7. Accessibility

Every row control has an `aria-label` like "column - member name". Dialogs have `role="dialog"`, `aria-modal` and
`aria-labelledby`. Status lines use `role="status"` and `aria-live="polite"`. Remaining gaps (date-picker keyboard
navigation, focus rings) are in [TASKS.md](./TASKS.md).

## 8. Invitation booklet

**Size**: page 9 x 12 in, sheet 18 x 12 in. Sizes are in inches because it is a physical print.

**Booklet print** is black and white: ornaments (toran, dancers, peacocks, corner flowers) in black line art, Amma
and the two deities in grey.

**WhatsApp, Normal**: the same layout in colour (Amma in colour, black ornaments).

**WhatsApp, Rich festive** (`invitation-festive.css`, only inside `@media print`):

| Part | Look |
|---|---|
| Palette | maroon `#7a1020`, deep maroon `#4a0a14`, gold `#c8961e`, light gold `#f6dfa0`, cream `#fff3d6`, gold line `#d9b66a` |
| Page | Cream radial-gradient background; maroon frame with a gold inner line and a soft gold halo |
| Ornaments | Corners in gold, toran, dancers and peacocks in maroon (ready-tinted PNGs) |
| Cover | Amma in the middle; Ganesha left and Murugan right, in colour, multiply-blended into the cream |
| Titles | Maroon pill with a gold border and cream text |
| Tables | Maroon header, gold lines, soft stripes, gold total row |

The text, page size and page order are identical in all three modes.

**Edit Mode**: in the preview every page is editable and a red "Edit Mode" banner says so.
