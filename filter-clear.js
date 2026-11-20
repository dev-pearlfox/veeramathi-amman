// A clear (x) button at the right end of every column filter box and filter dropdown, plus a highlighted border for as
// long as the filter has something in it. Shared by the Members page, the Accounts page and the Dashboard (styles are in
// filter-clear.css). It adds itself to every `.filter-input` on the page, so a new filter box needs no extra code.
//
// The x only empties the box and fires the same event the page already listens to ("input" for a box, "change" for a
// dropdown), so each page re-filters with its own code. It does not touch any page logic.

(function () {
  const X_ICON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  const isSelect = (el) => el.tagName === "SELECT";

  // "Has a filter" = anything typed, or a dropdown choice other than its first (All) option, whose value is "".
  const isFiltering = (el) => el.value !== "";

  // The x is centred on the INPUT, not on its cell: a cell is taller than its box (border, line gap), which left the x
  // 1-2px high. Measure the box and hand the numbers to the CSS (--fc-mid: the box's vertical middle, --fc-edge: the gap
  // between the box and the cell's right edge). No wrapper element, so the table layout is left exactly as it was.
  function place(el) {
    const button = el.filterClearButton;
    if (button.hidden || !el.offsetParent) return;
    const cell = el.offsetParent;
    button.style.setProperty("--fc-mid", el.offsetTop + el.offsetHeight / 2 + "px");
    button.style.setProperty("--fc-edge", cell.clientWidth - (el.offsetLeft + el.offsetWidth) + "px");
  }

  function sync(el) {
    const on = isFiltering(el);
    el.classList.toggle("has-value", on);
    el.filterClearButton.hidden = !on;
    place(el);
  }

  function attach(el) {
    const cell = el.closest("td, th") ?? el.parentElement;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-clear" + (isSelect(el) ? " filter-clear-select" : "");
    button.tabIndex = -1;   // a mouse / touch helper: tabbing through a filter row should not stop on every x
    button.hidden = true;
    button.setAttribute("aria-label", "Clear " + (el.getAttribute("aria-label") ?? "filter"));
    button.innerHTML = X_ICON;
    // mousedown would take the focus away from the box, then the click puts it straight back: stop the first step.
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => {
      el.value = "";   // text box: empty; dropdown: back to its first option (All)
      el.dispatchEvent(new Event(isSelect(el) ? "change" : "input", { bubbles: true }));
      sync(el);
      el.focus();
    });
    cell.classList.add("filter-clear-host");
    cell.appendChild(button);
    el.filterClearButton = button;
    // Re-place whenever the box or its cell changes size: the compact scroll shrink animates the box height, and the
    // Dashboard boxes start inside a hidden tab (size 0) until it is opened.
    const watcher = new ResizeObserver(() => place(el));
    watcher.observe(el);
    watcher.observe(cell);
    // A page may rebuild a dropdown's options and reset it in code, which fires no event (Accounts place filter).
    if (isSelect(el)) new MutationObserver(() => sync(el)).observe(el, { childList: true });
    sync(el);
  }

  const boxes = [...document.querySelectorAll(".filter-input")];
  boxes.forEach(attach);

  document.addEventListener("input", (e) => e.target.filterClearButton && sync(e.target));
  document.addEventListener("change", (e) => e.target.filterClearButton && sync(e.target));
  // Back / forward can restore what was typed without any event.
  window.addEventListener("pageshow", () => boxes.forEach(sync));
})();
