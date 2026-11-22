// The home icon in the Home Address cell and the one in the Postal Address cell (Members page) each open this popup: a labelled address form with
// Save and Cancel. It follows the page lock (body.master-locked, members.js): while the page is LOCKED (view mode) the
// popup only shows the saved address, read-only, with a Close button; once the page is UNLOCKED (edit mode) it can be
// typed in, pasted into and saved. Nothing is written until Save is clicked, so a stray tap cannot change anything. `people.address` is a jsonb object {door, street, area, town, country, state,
// district, pincode} (functions-dashboard/supabase/schema.sql). members.js draws the icon (addressButton) and keeps the
// saved object in allPeople; this file only handles the popup. Dropdown lists live in address-data.js.
//
// Two addresses per member share this one form: people.address (Home Address, the ஊர் cell) and people.postal_address
// (Postal Address). Each icon carries data-addr naming the column it edits (ADDR_KINDS below); the form is the same.
//
// Country / State / District are dropdowns where we have a list (see address-data.js) and a plain text box where we
// do not: any country outside India, any state outside India, any district outside Tamil Nadu. Country also has
// "Other…" which opens a text box for a country that is not on the list.

// One field per row, label on the left and the box on the right (see member-address.css), so the popup stays short.
const ADDRESS_FIELDS = [
  { key: "door", label: "கதவு எண் / Door No.", max: 40 },
  { key: "street", label: "தெரு / Street Name", max: 80 },
  { key: "area", label: "பகுதி / Area", max: 80 },
  { key: "town", label: "ஊர் / Town", max: 60 },
  { key: "city", label: "நகரம் / City", max: 60 },
  { key: "district", label: "மாவட்டம் / District", max: 60, choice: true },   // sits under Town / City; its list still depends on Country + State (see addrChoices)
  { key: "country", label: "நாடு / Country", max: 60, choice: true },
  { key: "state", label: "மாநிலம் / State", max: 60, choice: true },
  { key: "pincode", label: "பின்கோடு / Pincode", max: 10 },
];
const PASTE_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>';
const ADDR_OTHER = "__other";   // the "Other…" option's value in the country dropdown

// The two addresses a member has: the people column each icon edits, and the popup title for it. A new form starts from the
// ஊர் text beside the icon for Home Address (splitPlace), and at India / Tamil Nadu for Postal (see openAddressPopup).
const ADDR_KINDS = {
  address: { title: "Home address" },
  postal_address: { title: "Postal address" },
};

// The add-member row at the bottom has a Postal Address icon too, before the member exists. It edits this stand-in
// instead of a saved person: Save in the popup keeps the address in memory only, and members.js writes it with the
// rest of the new member when the row is added (addNewMember).
const NEW_MEMBER_ID = "new-draft";
const newMemberDraft = {
  id: NEW_MEMBER_ID,
  postal_address: null,
  get name() { return document.getElementById("new-m-name").value.trim() || "New member"; },
};
const addrPersonOf = (button) =>
  button.closest("tr").id === "new-member-row" ? newMemberDraft : allPeople.find((p) => p.id === button.closest("tr").dataset.person);

let addrPersonId = null;
let addrKind = "address";   // which of the two columns the open popup is editing
let addrButton = null;   // the icon the open popup hangs under
let addrDefaults = {};   // what the open form was pre-filled with (not a real address until something else is typed)
const addrPop = document.createElement("div");
addrPop.className = "addr-pop hidden";
addrPop.setAttribute("role", "dialog");
addrPop.setAttribute("aria-label", "Address");

const textBox = (f, hidden) =>
  `<input type="text" data-key="${f.key}" maxlength="${f.max}" class="${hidden ? "addr-hide" : ""}" autocomplete="off" />`;
addrPop.innerHTML = `
  <div class="addr-pop-title"></div>
  <div class="addr-grid">${ADDRESS_FIELDS.map((f) => `
    <label class="addr-field"><span class="addr-lab">${f.label}</span>
      <button type="button" class="addr-paste" data-key="${f.key}" title="Paste" aria-label="Paste into ${f.label}">${PASTE_ICON_SVG}</button>
      <span class="addr-ctl">${f.choice ? `<select data-key="${f.key}"></select>${textBox(f, true)}` : textBox(f, false)}</span>
    </label>`).join("")}
  </div>
  <p class="addr-pop-note"></p>
  <p class="addr-pop-error" role="alert"></p>
  <div class="addr-pop-actions">
    <button type="button" class="addr-pop-save">Save</button>
    <button type="button" class="addr-pop-cancel secondary">Cancel</button>
  </div>`;
document.body.appendChild(addrPop);

// key -> its text box, and (for dropdown fields) its select.
const addrCtl = {};
ADDRESS_FIELDS.forEach((f) => {
  addrCtl[f.key] = { text: addrPop.querySelector(`input[data-key="${f.key}"]`), select: addrPop.querySelector(`select[data-key="${f.key}"]`) };
});
const addrError = addrPop.querySelector(".addr-pop-error");
const addrNote = addrPop.querySelector(".addr-pop-note");
const addrCancelBtn = addrPop.querySelector(".addr-pop-cancel");

// View mode = the page is locked. Edit mode = the page is unlocked.
const addrViewOnly = () => document.body.classList.contains("master-locked");

// Locked: boxes are read-only, dropdowns disabled, paste/Save hidden (CSS .view-only) and Cancel becomes Close.
function applyAddressMode(viewOnly) {
  addrPop.classList.toggle("view-only", viewOnly);
  addrPop.querySelectorAll("input[data-key]").forEach((input) => { input.readOnly = viewOnly; input.tabIndex = viewOnly ? -1 : 0; });
  addrPop.querySelectorAll("select").forEach((select) => {
    select.disabled = viewOnly;
    select.classList.toggle("addr-empty", viewOnly && !select.value);   // an empty dropdown must show a bare line, not "— Select —"
  });
  addrCancelBtn.textContent = viewOnly ? "Close" : "Cancel";
}

const hasAddress = (address) => !!address && Object.values(address).some(Boolean);
// The icon turns orange only when every box of the address is filled in; a part-filled address keeps the plain icon.
// Town and City count as one: a place is usually one or the other, so either is enough.
const isAddressComplete = (address) =>
  !!address && (!!address.town || !!address.city) && ADDRESS_FIELDS.every((f) => f.key === "town" || f.key === "city" || !!address[f.key]);

// The current value of a field: the dropdown's pick when it is showing one, otherwise what is typed.
function addrValue(key) {
  const { text, select } = addrCtl[key];
  if (select && !select.classList.contains("addr-hide") && select.value !== ADDR_OTHER) return select.value;
  return text.value.trim();
}

// The list a dropdown field offers right now, or null when it should be a text box.
function addrChoices(key) {
  if (key === "country") return ADDR_COUNTRIES;
  const india = addrValue("country") === ADDR_INDIA;
  if (key === "state") return india ? ADDR_INDIA_STATES : null;
  return india && addrValue("state") === ADDR_DEFAULT_STATE ? ADDR_TN_DISTRICTS : null;
}

function setAddrChoice(key, value) {
  const { text, select } = addrCtl[key];
  const choices = addrChoices(key);
  text.value = "";
  if (!choices) {   // no list for this one: a plain text box
    select.classList.add("addr-hide");
    text.classList.remove("addr-hide");
    text.value = value;
    return;
  }
  const known = !value || choices.includes(value);
  // A saved value that is not on the list (state/district) is kept as an extra option so it is never lost on re-save.
  const list = known || key === "country" ? choices : [...choices, value];
  select.replaceChildren(new Option("— Select —", ""), ...list.map((c) => new Option(c, c)));
  if (key === "country") select.append(new Option("Other…", ADDR_OTHER));
  select.classList.remove("addr-hide");
  if (key === "country" && !known) {   // a country that is not on the list
    select.value = ADDR_OTHER;
    text.value = value;
    text.classList.remove("addr-hide");
  } else {
    select.value = value;
    text.classList.add("addr-hide");
  }
}

// Indian pincodes are 6 digits; abroad they vary, so only India is checked.
function updatePincodeRules() {
  addrCtl.pincode.text.maxLength = addrValue("country") === ADDR_INDIA ? 6 : 10;
}

function fillAddressForm(address) {
  ADDRESS_FIELDS.filter((f) => !f.choice).forEach((f) => { addrCtl[f.key].text.value = address[f.key] ?? ""; });
  setAddrChoice("country", address.country ?? "");
  setAddrChoice("state", address.state ?? "");
  setAddrChoice("district", address.district ?? "");
  updatePincodeRules();
}

const addrCountryOf = (text) => {
  const key = (text ?? "").toLowerCase();
  return ADDR_COUNTRY_ALIASES[key] ?? ADDR_COUNTRIES.find((c) => c.toLowerCase() === key) ?? null;
};

// The ஊர் cell reads "Area, City" (e.g. "குகை, சேலம்"): the first part is the area and what follows is the city when the last
// part is a known city in ADDR_CITIES, otherwise the town. A lone name is an area ("கன்னங்குறிச்சி") unless it is a known city
// (ADDR_CITIES, goes to City) or a known town (ADDR_TOWNS, goes to Town); that also sets the state. If the last part names a country ("துபாய்", "USA") that is the country
// instead, with the state left blank. With no country named the state is the city's, else Tamil Nadu.
function splitPlace(place) {
  const parts = place.split(",").map((s) => s.trim()).filter(Boolean);
  const country = addrCountryOf(parts[parts.length - 1]);
  if (country) parts.pop();
  let [area = "", ...rest] = parts;
  if (!rest.length && (ADDR_CITIES[area] || ADDR_TOWNS[area])) [area, rest] = ["", [area]];
  const last = rest[rest.length - 1];
  const isCity = !!ADDR_CITIES[last];
  const india = !country || country === ADDR_INDIA;
  const state = india ? (ADDR_CITIES[last] ?? ADDR_TOWNS[last] ?? ADDR_DEFAULT_STATE) : "";
  return { country: country ?? ADDR_INDIA, state, area, town: (isCity ? rest.slice(0, -1) : rest).join(", "), city: isCity ? last : "" };
}

function closeAddressPopup() {
  addrPop.classList.add("hidden");
  addrPersonId = null;
  addrButton = null;
}

// Sits just under the icon, kept inside the screen. Also re-run on scroll/resize (a phone keyboard fires resize,
// so closing there would throw the popup away mid-typing).
function placeAddressPopup() {
  if (!addrButton) return;
  const r = addrButton.getBoundingClientRect();
  addrPop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - addrPop.offsetWidth - 8)) + "px";
  addrPop.style.top = Math.max(8, Math.min(r.bottom + 6, window.innerHeight - addrPop.offsetHeight - 8)) + "px";
}

function openAddressPopup(button) {
  const person = addrPersonOf(button);
  if (!person) return;
  addrPersonId = person.id;
  addrKind = button.dataset.addr;
  addrButton = button;
  const saved = person[addrKind];
  addrPop.querySelector(".addr-pop-title").textContent = `${displayName(person)} - ${ADDR_KINDS[addrKind].title}`;
  const viewOnly = addrViewOnly();
  // Edit mode, Home Address: pre-filled from the ஊர் cell the icon sits in (what is on screen, even if just edited; see
  // splitPlace). Postal Address: just India / Tamil Nadu. A saved address wins over these. They are only stored if
  // something else is typed. View mode: only what is really saved, never the guesses.
  const fromPlace = () => splitPlace(button.closest("td").querySelector(".cell-input")?.value ?? "");
  addrDefaults = viewOnly ? {} : addrKind === "address" ? fromPlace() : { country: ADDR_INDIA, state: ADDR_DEFAULT_STATE };
  fillAddressForm({ ...addrDefaults, ...(hasAddress(saved) ? saved : {}) });
  applyAddressMode(viewOnly);
  addrNote.textContent = viewOnly && !hasAddress(saved) ? "No address saved yet. Click Edit to add one." : "";
  addrError.textContent = "";
  addrPop.classList.remove("hidden");
  placeAddressPopup();
  if (!viewOnly) addrCtl.door.text.focus();
}

async function saveAddress() {
  if (addrViewOnly()) return;   // Enter in a box must not save while the page is locked
  const person = addrPersonId === NEW_MEMBER_ID ? newMemberDraft : allPeople.find((p) => p.id === addrPersonId);
  if (!person) return;
  const parts = {};
  ADDRESS_FIELDS.forEach((f) => {
    const value = addrValue(f.key);
    if (value) parts[f.key] = value;
  });
  if (parts.country === ADDR_INDIA && parts.pincode && !/^\d{6}$/.test(parts.pincode)) {
    addrError.textContent = "Pincode must be exactly 6 digits.";
    addrCtl.pincode.text.focus();
    return;
  }
  // Only the pre-filled values (from the cell, plus India / Tamil Nadu) and nothing else typed means there is no address to store.
  const onlyDefaults = Object.entries(parts).every(([k, v]) => v === addrDefaults[k]);
  const address = Object.keys(parts).length && !onlyDefaults ? parts : null;
  if (JSON.stringify(person[addrKind] ?? null) !== JSON.stringify(address)) {
    const isDraft = person === newMemberDraft;
    if (!isDraft) {
      const { error } = await client.from("people").update({ [addrKind]: address }).eq("id", person.id);
      if (error) {
        addrError.textContent = "Error saving: " + error.message;
        return;
      }
    }
    person[addrKind] = address;
    const icon = isDraft ? document.getElementById("new-m-postal-btn") : document.querySelector(`#members-body tr[data-person="${person.id}"] .addr-btn[data-addr="${addrKind}"]`);
    if (icon) {
      icon.classList.toggle("address-complete", isAddressComplete(address));
      const town = icon.closest("td").querySelector(".postal-town");   // only the Postal cell has one: its town text follows the form
      if (town) town.value = addrPlaceText(address);
    }
    setStatus(isDraft ? "Postal address kept. It is saved when you add the member." : "Saved.", false);
  }
  closeAddressPopup();
}

// A new country re-decides what State, District and Pincode offer (shared by the dropdown and the paste buttons).
function cascadeFromCountry() {
  setAddrChoice("state", addrValue("country") === ADDR_INDIA ? ADDR_DEFAULT_STATE : "");
  setAddrChoice("district", "");
  updatePincodeRules();
}

// "Paste" button in front of each box: puts the clipboard text into that one field. For a dropdown field the text is
// matched to its list ignoring case ("tamil nadu" -> "Tamil Nadu"); anything not on the list falls back to the same
// "Other" / extra-option handling as a saved value (setAddrChoice).
const addrMatch = (key, value) =>
  key === "country" ? (addrCountryOf(value) ?? value) : ((addrChoices(key) ?? []).find((c) => c.toLowerCase() === value.toLowerCase()) ?? value);

async function pasteIntoField(key) {
  if (addrViewOnly()) return;
  let clip;
  try {
    clip = await navigator.clipboard.readText();
  } catch {
    addrError.textContent = "Could not read the clipboard. Allow paste when the browser asks.";
    return;
  }
  const value = clip.replace(/\s+/g, " ").trim();   // one line, no stray spaces
  if (!value) {
    addrError.textContent = "The clipboard is empty.";
    return;
  }
  addrError.textContent = "";
  const { text } = addrCtl[key];
  if (!ADDRESS_FIELDS.find((f) => f.key === key).choice) {
    const digitsOnly = key === "pincode" && addrValue("country") === ADDR_INDIA;
    text.value = (digitsOnly ? value.replace(/\D/g, "") : value).slice(0, text.maxLength);
    text.focus();
    return;
  }
  setAddrChoice(key, addrMatch(key, value));
  if (key === "country") cascadeFromCountry();
  if (key === "state") setAddrChoice("district", "");
}

addrPop.addEventListener("click", (e) => {
  const button = e.target.closest(".addr-paste");
  if (button) pasteIntoField(button.dataset.key);
});

// Changing a dropdown re-decides what the ones after it offer.
addrCtl.country.select.addEventListener("change", () => {
  const { text, select } = addrCtl.country;
  const other = select.value === ADDR_OTHER;
  text.classList.toggle("addr-hide", !other);
  text.value = "";
  if (other) text.focus();
  cascadeFromCountry();
});
addrCtl.country.text.addEventListener("input", () => { updatePincodeRules(); });
addrCtl.state.select.addEventListener("change", () => setAddrChoice("district", ""));

// Pincode takes digits only in India.
addrCtl.pincode.text.addEventListener("input", (e) => {
  if (addrValue("country") === ADDR_INDIA) e.target.value = e.target.value.replace(/\D/g, "");
});
addrPop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("input[data-key]")) { e.preventDefault(); saveAddress(); }
});

// document.getElementById, not members.js's `$`: this file loads BEFORE members.js, so `$` does not exist yet here and
// using it threw at load, which silently killed every listener below (the home icon did nothing).
function onAddressIconClick(e) {
  const button = e.target.closest(".addr-btn");
  if (!button || button.disabled) return;
  const sameOpen = addrPersonId === addrPersonOf(button)?.id && addrKind === button.dataset.addr;
  if (sameOpen && !addrPop.classList.contains("hidden")) closeAddressPopup();
  else openAddressPopup(button);
}
document.getElementById("members-body").addEventListener("click", onAddressIconClick);
document.getElementById("new-member-row").addEventListener("click", onAddressIconClick);
addrPop.querySelector(".addr-pop-save").addEventListener("click", saveAddress);
addrPop.querySelector(".addr-pop-cancel").addEventListener("click", closeAddressPopup);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAddressPopup(); });
document.addEventListener("mousedown", (e) => {
  if (!addrPop.classList.contains("hidden") && !addrPop.contains(e.target) && !e.target.closest(".addr-btn")) closeAddressPopup();
});
window.addEventListener("resize", placeAddressPopup);
window.addEventListener("scroll", placeAddressPopup, { passive: true });

// Locking or unlocking the page while the popup is open closes it, so a view popup never turns editable (or the other
// way round) with half-typed text in it. Reopen it to get the new mode.
let addrWasViewOnly = addrViewOnly();
new MutationObserver(() => {
  const now = addrViewOnly();
  if (now === addrWasViewOnly) return;
  addrWasViewOnly = now;
  closeAddressPopup();
}).observe(document.body, { attributes: true, attributeFilter: ["class"] });
