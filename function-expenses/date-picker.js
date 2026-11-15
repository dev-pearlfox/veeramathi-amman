// A calendar popup in the site's own look for every <input type="date"> (members' பிறந்த தேதி, the வரவு tables' தேதி).
// The browser's own date popup cannot be styled, so on desktop this replaces it. The input itself stays a real date
// input: typing in its boxes still works, `input.value` is still "YYYY-MM-DD", and picking a day fires the same
// `input` / `change` events a native pick does, so members.js and income.js need no changes. Touch devices keep their
// native date dialog (it is already good there). Styles: date-picker.css.
//
// Opens on click (or Alt+Down / F4), closes on Esc, a click elsewhere, or moving to another field. Honours the
// input's min / max. Three views: days; click the title for months; click that title for years (fast for old birth years).

(() => {
  const DESKTOP = window.matchMedia("(hover: hover) and (pointer: fine)");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
  const CHEVRON = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON_PREV = CHEVRON("M15 6l-6 6 6 6");
  const ICON_NEXT = CHEVRON("M9 6l6 6-6 6");
  const ICON_DOWN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const pad = (n) => String(n).padStart(2, "0");
  const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;   // m is 0-based, like Date
  const parseIso = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? { y: +s.slice(0, 4), m: +s.slice(5, 7) - 1, d: +s.slice(8) } : null);
  const todayIso = () => { const t = new Date(); return toIso(t.getFullYear(), t.getMonth(), t.getDate()); };

  const pop = document.createElement("div");
  pop.className = "dp-pop hidden";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", "Choose a date");
  document.body.appendChild(pop);

  let input = null;        // the date input the popup belongs to (null = closed)
  let view = "days";       // "days" | "months" | "years"
  let viewYear = 0;
  let viewMonth = 0;

  const minIso = () => input.min || "";
  const maxIso = () => input.max || "";
  const inRange = (iso) => (!minIso() || iso >= minIso()) && (!maxIso() || iso <= maxIso());

  function daysHtml(selIso, today) {
    const first = new Date(viewYear, viewMonth, 1);
    const cells = Array.from({ length: 42 }, (_, i) => {   // always 6 rows, so the popup never changes height
      const day = new Date(viewYear, viewMonth, 1 - first.getDay() + i);
      const iso = toIso(day.getFullYear(), day.getMonth(), day.getDate());
      const cls = ["dp-day", day.getMonth() !== viewMonth && "dp-out", iso === selIso && "dp-sel", iso === today && "dp-today"].filter(Boolean).join(" ");
      return `<button type="button" class="${cls}" data-act="day" data-iso="${iso}" aria-label="${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}"${inRange(iso) ? "" : " disabled"}>${day.getDate()}</button>`;
    }).join("");
    return `<div class="dp-grid dp-week">${WEEKDAYS.map((w) => `<span>${w}</span>`).join("")}</div><div class="dp-grid">${cells}</div>`;
  }

  function monthsHtml(sel, today) {
    return `<div class="dp-grid dp-grid-3">${MONTHS.map((name, m) => {
      const ok = (!minIso() || toIso(viewYear, m, 31) >= minIso()) && (!maxIso() || toIso(viewYear, m, 1) <= maxIso());
      const cls = ["dp-cell", sel && sel.y === viewYear && sel.m === m && "dp-sel", today.y === viewYear && today.m === m && "dp-today"].filter(Boolean).join(" ");
      return `<button type="button" class="${cls}" data-act="month" data-m="${m}"${ok ? "" : " disabled"}>${name.slice(0, 3)}</button>`;
    }).join("")}</div>`;
  }

  function yearsHtml(sel, today, start) {
    const minY = minIso() ? +minIso().slice(0, 4) : -Infinity;
    const maxY = maxIso() ? +maxIso().slice(0, 4) : Infinity;
    return `<div class="dp-grid dp-grid-3">${Array.from({ length: 12 }, (_, i) => {
      const y = start + i;
      const cls = ["dp-cell", sel && sel.y === y && "dp-sel", today.y === y && "dp-today"].filter(Boolean).join(" ");
      return `<button type="button" class="${cls}" data-act="year" data-y="${y}"${y >= minY && y <= maxY ? "" : " disabled"}>${y}</button>`;
    }).join("")}</div>`;
  }

  function render() {
    const sel = parseIso(input.value);
    const today = parseIso(todayIso());
    const yearsStart = viewYear - (viewYear % 12);
    const title = view === "days" ? `${MONTHS[viewMonth]} ${viewYear}` : view === "months" ? String(viewYear) : `${yearsStart} – ${yearsStart + 11}`;
    const body = view === "days" ? daysHtml(input.value, todayIso()) : view === "months" ? monthsHtml(sel, today) : yearsHtml(sel, today, yearsStart);
    pop.innerHTML = `
      <div class="dp-head">
        ${view === "years"
          ? `<span class="dp-title dp-title-static">${title}</span>`
          : `<button type="button" class="dp-title" data-act="title" aria-label="Choose month or year">${title}${ICON_DOWN}</button>`}
        <div class="dp-nav">
          <button type="button" class="dp-arrow" data-act="prev" aria-label="Previous">${ICON_PREV}</button>
          <button type="button" class="dp-arrow" data-act="next" aria-label="Next">${ICON_NEXT}</button>
        </div>
      </div>
      ${body}
      <div class="dp-foot">
        <button type="button" class="dp-link dp-clear" data-act="clear">Clear</button>
        <button type="button" class="dp-link" data-act="today"${inRange(todayIso()) ? "" : " disabled"}>Today</button>
      </div>`;
  }

  // Under the input, or above it when there is no room; kept inside the screen.
  function place() {
    if (!input) return;
    if (!input.isConnected) { close(); return; }   // the table was redrawn under us
    const r = input.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const below = r.bottom + 6;
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
    pop.style.top = (below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below) + "px";
  }

  function open(target) {
    if (!DESKTOP.matches || target.readOnly || target.disabled) return;
    if (input === target) return;   // already open for this one (a click on its boxes just edits)
    input = target;
    const start = parseIso(input.value) ?? parseIso(todayIso());
    viewYear = start.y;
    viewMonth = start.m;
    view = "days";
    render();
    pop.classList.remove("hidden");
    place();
  }

  function close() {
    pop.classList.add("hidden");
    input = null;
  }

  // Sets the date exactly like a native pick would (events included), then leaves the field: members.js saves a cell
  // when it loses focus, income.js saves on `input`.
  function choose(iso) {
    const target = input;
    close();
    target.value = iso;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.blur();
  }

  const step = (n) => {   // previous / next: a month in the days view, a year in months, twelve years in years
    if (view === "days") {
      const d = new Date(viewYear, viewMonth + n, 1);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
    } else {
      viewYear += view === "months" ? n : 12 * n;
    }
  };

  const ACTIONS = {
    title: () => { view = view === "days" ? "months" : "years"; },
    prev: () => step(-1),
    next: () => step(1),
    month: (b) => { viewMonth = +b.dataset.m; view = "days"; },
    year: (b) => { viewYear = +b.dataset.y; view = "months"; },
  };

  pop.addEventListener("mousedown", (e) => e.preventDefault());   // keep the focus in the input, so clicking here never "leaves" the field
  pop.addEventListener("click", (e) => {
    const button = e.target.closest("[data-act]");
    if (!button || button.disabled) return;
    const act = button.dataset.act;
    if (act === "day") return choose(button.dataset.iso);
    if (act === "today") return choose(todayIso());
    if (act === "clear") return choose("");
    ACTIONS[act](button);
    render();
    place();
  });

  // Opening and closing.
  document.addEventListener("click", (e) => {
    const target = e.target.closest?.('input[type="date"]');
    if (target) open(target);
  });
  document.addEventListener("focusin", (e) => {   // tabbing to another field leaves this one
    if (input && e.target !== input && !pop.contains(e.target)) close();
  });
  document.addEventListener("mousedown", (e) => {   // Safari does not move focus when clicking blank space
    if (input && e.target !== input && !pop.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input) close();
    else if ((e.key === "F4" || (e.altKey && e.key === "ArrowDown")) && e.target.matches?.('input[type="date"]')) {
      e.preventDefault();
      open(e.target);
    }
  });
  // Typing a full date in the boxes moves the calendar to it.
  document.addEventListener("input", (e) => {
    if (e.target !== input) return;
    const typed = parseIso(input.value);
    if (typed) { viewYear = typed.y; viewMonth = typed.m; }
    render();
  });
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, { capture: true, passive: true });
})();
