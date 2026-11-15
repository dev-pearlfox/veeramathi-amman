// HEART LOGIC — do not change without asking first.
// Scroll-compact shrink / expand / freeze for the sticky header stack. ONE copy, used by index.html AND members.html
// (it used to live in app.js, with members.js carrying a simpler, different version that expanded only at the very top).
// Needs, on the page: <main>, .sticky-top-stack, and the body.is-scrolled rules in style.css. Call initScrollCompact() once;
// it returns { rearmFreeze } for app.js, which re-arms the freeze after the login gate hides (see unlockApp).
function initScrollCompact() {
  // Armed on page load too, so the very first scroll down gets the freeze-then-release treatment. Declared first so
  // nothing that calls rearmFreeze() can ever hit it before it exists.
  let freezeArmed = true;

  // HEART LOGIC — do not change without asking (scrollY-based shrink +
  // wheel-delta-gated expand + a post-expand grace period + a re-armable
  // scroll freeze). Two earlier versions computed scroll direction by
  // diffing window.scrollY between animation frames — unreliable during
  // real trackpad momentum scrolling, since the deceleration tail can
  // report tiny/jittery or even momentarily-reversed deltas frame to frame,
  // so "expand" could fire and then get undone by the very next frame
  // misreading its own direction. Wheel events' own deltaY is the actual
  // physical input signal (not a derived diff of eased scroll position), so
  // it doesn't suffer that jitter — used for both the expand check and the
  // freeze check below. Shrinking itself stays the simple, already-
  // confirmed-reliable scrollY>10 check (any scroll method — wheel,
  // scrollbar, keyboard — not just wheel), but the same wheel gesture that
  // triggers an expand also keeps scrolling the page (there's one shared
  // page-level scroll, not a separate non-scrolling header zone), so its
  // trailing native "scroll" events — and momentum after it — would
  // otherwise immediately re-shrink it. suppressShrinkUntil is a short
  // grace window after an expand during which the shrink check is skipped,
  // so that same gesture can't undo itself.
  let scrollTicking = false;
  let suppressShrinkUntil = 0;
  function updateScrollCompactState() {
    if (window.scrollY > 10 && Date.now() > suppressShrinkUntil) {
      document.body.classList.add("is-scrolled");
    }
    scrollTicking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(updateScrollCompactState);
    },
    { passive: true }
  );

  // Freeze: whenever the top content is expanded (freezeArmed) and the user
  // starts to scroll down, the spreadsheet is held exactly where it is —
  // not necessarily scrollY 0; see freezeHoldY — while the shrink animation
  // plays, then released after ~350ms so the NEXT scroll is what actually
  // moves the spreadsheet. Re-arms every time the header expands again (see
  // freezeArmed = true in the wheel-expand handler below) — by explicit
  // request, this isn't a one-time-on-page-load thing, it applies to every
  // expand→scroll-down transition for the life of the page.
  //
  // The actual block is position:fixed on <body> (with a negative top offset
  // compensating so nothing visually jumps), NOT overflow:hidden and NOT
  // preventDefault() on wheel events alone — two earlier versions tried
  // both and both leaked under a real trackpad in real Chrome. A fast/big
  // trackpad flick starts a momentum/fling animation that Chrome runs on
  // the compositor thread, independent of the main JS thread; once that
  // fling has begun, neither cancelling later wheel events nor toggling
  // overflow reliably stops it — the fling can keep running to completion
  // regardless, easily outlasting a fixed freeze timer. position:fixed
  // removes <body> from the scrollable flow entirely, so there is no
  // scrollable content left for a fling to move — not "discouraged",
  // structurally impossible — which is the same technique production
  // scroll-lock libraries use for exactly this class of bug. The
  // preventDefault() calls on wheel/touchmove/keydown are kept as a
  // first-line catch for the common case (stops the scroll before the lock
  // even needs to engage, when timing lines up) — position:fixed is what
  // guarantees the freeze holds even when it doesn't.
  // Pinning <body> alone isn't enough: is-scrolled also transitions the
  // header/pills/#sheet-title's margin-bottom (not just their compositor-
  // only transform) over the same ~200ms, which shrinks .sticky-top-stack's
  // real document height as it plays — that pulls everything below it
  // (<main>, i.e. the spreadsheet) upward in the document, independent of
  // scroll position, so body's fixed offset alone doesn't stop it from
  // visibly drifting during the freeze. <main> is pinned separately here,
  // at its own on-screen position captured before anything shrinks, so it
  // can't move regardless of what the header's layout does above it. This
  // doesn't touch the header/title margin-collapse mechanism itself (HEART
  // LOGIC elsewhere in this file/style.css) — it just holds <main> still
  // alongside it. freezeArmed is declared at the top of initScrollCompact below.
  let freezeActive = false;
  let freezeHoldY = 0;
  // Tracks the last confirmed scroll position while genuinely un-frozen —
  // used instead of a live window.scrollY read inside beginFreeze(), since
  // a very fast/big gesture can let the compositor start an optimistic
  // scroll before our event handler even runs (see beginFreeze's own
  // comment); reading scrollY at that point would lock in the
  // already-leaked position instead of correcting back to the clean one.
  let freezeLastKnownScrollY = window.scrollY;
  const mainEl = document.querySelector("main");
  function beginFreeze() {
    if (!freezeArmed || freezeActive) return;
    freezeArmed = false;
    freezeActive = true;
    freezeHoldY = freezeLastKnownScrollY;
    // Correct any lead-in leak (see comment on freezeLastKnownScrollY above)
    // before measuring <main>'s position, so the lock captures the clean
    // pre-gesture layout, not a slightly-already-scrolled one.
    if (window.scrollY !== freezeHoldY) window.scrollTo(0, freezeHoldY);
    const mainTop = mainEl.getBoundingClientRect().top;
    document.body.classList.add("is-scrolled");
    document.body.style.position = "fixed";
    document.body.style.top = -freezeHoldY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    mainEl.style.position = "fixed";
    mainEl.style.top = mainTop + "px";
    mainEl.style.left = "0";
    mainEl.style.right = "0";
    setTimeout(() => {
      freezeActive = false;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      mainEl.style.position = "";
      mainEl.style.top = "";
      mainEl.style.left = "";
      mainEl.style.right = "";
      window.scrollTo(0, freezeHoldY);
      freezeLastKnownScrollY = freezeHoldY;
    }, 350);
  }
  function onWheelForFreeze(e) {
    if (e.deltaY <= 0 || (!freezeArmed && !freezeActive)) return;
    e.preventDefault();
    beginFreeze();
  }
  let freezeTouchStartY = null;
  function onTouchStartForFreeze(e) {
    freezeTouchStartY = e.touches[0].clientY;
  }
  function onTouchMoveForFreeze(e) {
    if (freezeTouchStartY === null || (!freezeArmed && !freezeActive)) return;
    if (freezeTouchStartY - e.touches[0].clientY > 0) {
      e.preventDefault();
      beginFreeze();
    }
  }
  const FREEZE_DOWN_KEYS = new Set(["ArrowDown", "PageDown", " ", "End"]);
  function onKeyForFreeze(e) {
    if (!FREEZE_DOWN_KEYS.has(e.key) || (!freezeArmed && !freezeActive)) return;
    // Space / arrows are ordinary typing and button activation inside a field or button (the Members sheet is full of
    // inputs) — never swallow those, only page-level scroll keys.
    if (e.target && e.target.closest && e.target.closest("input, select, textarea, button, [contenteditable]")) return;
    e.preventDefault();
    beginFreeze();
  }
  window.addEventListener("wheel", onWheelForFreeze, { passive: false });
  window.addEventListener("touchstart", onTouchStartForFreeze, { passive: true });
  window.addEventListener("touchmove", onTouchMoveForFreeze, { passive: false });
  window.addEventListener("keydown", onKeyForFreeze);
  // Scrollbar-dragging fires none of the above — it's not a cancelable
  // input event, just a resulting "scroll". Catch it here: if scrollY moved
  // while still armed (nothing else caught it first), snap back to where it
  // was and begin the freeze from there instead. Also keeps
  // freezeLastKnownScrollY (declared above, used by beginFreeze) current.
  window.addEventListener(
    "scroll",
    () => {
      if (freezeActive) return;
      // Only a DOWNWARD drift counts as an uncaught scrollbar-drag needing a
      // freeze — an upward one is just as likely to be the natural scroll
      // that a wheel-over-header expand causes on its own (freezeArmed is
      // set true synchronously right before that scroll fires), and treating
      // that as a fresh down-attempt would immediately re-shrink what was
      // just expanded.
      if (freezeArmed && window.scrollY > freezeLastKnownScrollY) {
        window.scrollTo(0, freezeLastKnownScrollY);
        beginFreeze();
      }
      freezeLastKnownScrollY = window.scrollY;
    },
    { passive: true }
  );

  const stickyTopStackEl = document.querySelector(".sticky-top-stack");
  window.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY >= 0 || !stickyTopStackEl) return;
      const rect = stickyTopStackEl.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        document.body.classList.remove("is-scrolled");
        suppressShrinkUntil = Date.now() + 600;
        freezeArmed = true;
      }
    },
    { passive: true }
  );
  updateScrollCompactState();

  return { rearmFreeze() { freezeArmed = true; } };
}
