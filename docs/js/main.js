(() => {

  // Keep page at top on first paint & disable browser auto-restore
(function () {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // run twice to beat any late layout shifts
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 0);
})();

// shared smooth scroll used across components
window.smoothScrollTo = window.smoothScrollTo || function smoothScrollTo(selector, duration = 700) {
  const el = document.querySelector(selector);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.pageYOffset;
  window.scrollTo({ top, behavior: 'smooth' });
};

// Anti-autoscroll: pin to top for ~300ms unless user scrolls
(function antiAutoScroll(){
  let pinned = true;
  const start = performance.now();
  function tick(){
    const now = performance.now();
    if (now - start > 300 || !pinned) return;
    // only pin if user hasn't scrolled themselves
    if (window.pageYOffset < 4) window.scrollTo(0, 0);
    requestAnimationFrame(tick);
  }
  window.addEventListener("wheel",   () => { pinned = false; }, { once: true, passive: true });
  window.addEventListener("touchend",() => { pinned = false; }, { once: true, passive: true });
  requestAnimationFrame(tick);
})();

  window.addEventListener("load", () => {
    // prevent any residual scroll from previous refreshes/anchors
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
  });

  // API base auto-detect: localhost -> local Flask, otherwise Render
  (function setApiBase() {
    const isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    window.API_BASE = isLocal ? "" : "https://YOUR-RENDER-APP.onrender.com";
  })();

  // ensure top on first load
  document.addEventListener("DOMContentLoaded", () => {
    if (!location.hash) window.scrollTo(0, 0);
  });

  document.addEventListener("DOMContentLoaded", () => {
    // Wire the “Get started” / hero button (supports id or data-attribute)
    const getStarted =
      document.querySelector('[data-action="get-started"]') ||
      document.getElementById("getStarted");

    if (getStarted) {
      getStarted.addEventListener("click", (e) => {
        e.preventDefault();
        window.smoothScrollTo("preferences-component", 20);
      });
    }

    // Make sure a suggestions-component exists (append once if missing)
    if (!document.querySelector("suggestions-component")) {
      const sc = document.createElement("suggestions-component");
      document.body.appendChild(sc);
    }
  });
})();