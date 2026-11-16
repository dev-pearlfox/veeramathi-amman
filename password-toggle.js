// An eye button at the right end of every password box: press it to show what you typed, press again to hide it.
// Shared by the Accounts page and the Dashboard (the styles are in password-toggle.css).
//
// It adds itself to every <input type="password"> on the page, now and later (the Dashboard builds its change-password
// cards with JS after load), so no page has to remember to ask for it.

(function () {
  const EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19C5.6 19 2 12 2 12a18.6 18.6 0 0 1 4.1-5.1M9.9 5.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function setShown(input, button, shown) {
    input.type = shown ? "text" : "password";
    button.innerHTML = shown ? EYE_OFF : EYE;
    button.setAttribute("aria-pressed", String(shown));
    button.setAttribute("aria-label", shown ? "Hide password" : "Show password");
  }

  function addToggle(input) {
    if (input.dataset.pwToggle) return;           // already has its eye
    input.dataset.pwToggle = "1";
    const wrap = document.createElement("span");
    wrap.className = "pw-field";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const button = document.createElement("button");
    button.type = "button";                       // never submits the form
    button.className = "pw-toggle";
    setShown(input, button, false);
    // mousedown is stopped so the box keeps its cursor (and, on a phone, its keyboard) while the eye is pressed
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", () => setShown(input, button, input.type === "password"));
    wrap.appendChild(button);
    // A form that clears itself after a successful change goes back to hidden, so the next person doesn't see a typed password.
    input.form?.addEventListener("reset", () => setShown(input, button, false));
  }

  const addAll = () => document.querySelectorAll('input[type="password"]').forEach(addToggle);
  addAll();
  new MutationObserver(addAll).observe(document.documentElement, { childList: true, subtree: true });
})();
