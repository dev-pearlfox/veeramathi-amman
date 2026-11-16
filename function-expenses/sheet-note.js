// The குறிப்பு (notes) column of the Ledger Sheet (index.html): a 30px column holding only a notes icon per row. The icon is
// faded while the row has no note and bright (orange) once it has one; hovering it shows the note, clicking it opens this
// popup to type or edit the note, with Save and Cancel. Nothing is written until Save, so a stray tap changes nothing.
//
// The note itself still lives in the row's hidden <input class="f-paid"> (app.js renders it; rowValues()/saveRow() read it
// and store it in ledger_entries.paid exactly as before), so saving here is: set that hidden value, then scheduleSave()
// (app.js) like any other cell edit. app.js calls noteButton() while drawing the rows.

const NOTE_SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
// A sticky note with a folded corner and two text lines.
const NOTE_ICON_SVG = `<svg ${NOTE_SVG_ATTRS}><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M8.5 12h7M8.5 16h5"/></svg>`;

const noteButton = (note, who) =>
  `<button type="button" class="note-btn${note ? " has-note" : ""}" title="${escapeHtml(note || "Add note")}" aria-label="Note for ${escapeHtml(who)}">${NOTE_ICON_SVG}</button>`;

// The column title is just the icon (the word stays as screen-reader / print text in index.html).
document.querySelector(".note-th").insertAdjacentHTML("afterbegin", NOTE_ICON_SVG);

const noteBody = document.getElementById("sheet-body");
const notePop = document.createElement("div");
notePop.className = "note-pop hidden";
notePop.setAttribute("role", "dialog");
notePop.setAttribute("aria-label", "Note");
notePop.innerHTML = `
  <div class="note-pop-title"></div>
  <textarea rows="5" aria-label="Note text" placeholder="Type a note..."></textarea>
  <div class="note-pop-actions">
    <button type="button" class="note-pop-save">Save</button>
    <button type="button" class="note-pop-cancel secondary">Cancel</button>
  </div>`;
document.body.appendChild(notePop);
const noteText = notePop.querySelector("textarea");

let notePersonId = null;
let noteButtonEl = null;   // the icon the open popup hangs under

const noteRow = () => noteBody.querySelector(`tr[data-person="${notePersonId}"]`);
const noteSaved = () => noteRow()?.querySelector(".f-paid").value ?? "";
const noteIsOpen = () => !notePop.classList.contains("hidden");
const noteIsDirty = () => noteIsOpen() && noteText.value.trim() !== noteSaved();

// Under the icon, right edges lined up (the column is at the far right); above it when there is no room below.
function placeNotePopup() {
  if (!noteIsOpen() || !noteButtonEl?.isConnected) return;
  const r = noteButtonEl.getBoundingClientRect();
  const w = notePop.offsetWidth, h = notePop.offsetHeight;
  const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
  const below = r.bottom + 6;
  const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
  notePop.style.left = `${left}px`;
  notePop.style.top = `${top}px`;
}

function openNotePopup(button) {
  const tr = button.closest("tr");
  notePersonId = tr.dataset.person;
  noteButtonEl = button;
  notePop.querySelector(".note-pop-title").textContent = tr.querySelector(".f-name").value;
  noteText.value = tr.querySelector(".f-paid").value;
  notePop.classList.remove("hidden");
  placeNotePopup();
  noteText.focus();
  noteText.setSelectionRange(noteText.value.length, noteText.value.length);
}

function closeNotePopup() {
  if (!noteIsOpen()) return;
  notePop.classList.add("hidden");
  if (noteButtonEl?.isConnected) noteButtonEl.focus();
  notePersonId = null;
  noteButtonEl = null;
}

function saveNote() {
  const tr = noteRow();
  const note = noteText.value.trim();
  if (tr && note !== noteSaved()) {
    tr.querySelector(".f-paid").value = note;
    noteButtonEl.classList.toggle("has-note", !!note);
    noteButtonEl.title = note || "Add note";
    scheduleSave(tr.dataset.person, tr, true);   // app.js: saves the row right away, like a ticked head tax
  }
  closeNotePopup();
}

noteBody.addEventListener("click", (e) => {
  const button = e.target.closest(".note-btn");
  if (!button) return;
  if (noteIsOpen() && noteButtonEl === button) closeNotePopup();
  else openNotePopup(button);
});
notePop.querySelector(".note-pop-save").addEventListener("click", saveNote);
notePop.querySelector(".note-pop-cancel").addEventListener("click", closeNotePopup);
notePop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote(); }   // plain Enter stays a new line
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNotePopup(); });
// A click elsewhere closes it, unless something was typed: then it stays, so half a note is never lost by a stray click.
document.addEventListener("mousedown", (e) => {
  if (noteIsOpen() && !notePop.contains(e.target) && !e.target.closest(".note-btn") && !noteIsDirty()) closeNotePopup();
});
window.addEventListener("resize", placeNotePopup);
window.addEventListener("scroll", placeNotePopup, { passive: true });
// Drawing the rows again (a filter, another function) replaces every icon, so the popup has nothing to hang under.
new MutationObserver(closeNotePopup).observe(noteBody, { childList: true });
