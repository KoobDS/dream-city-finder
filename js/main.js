(() => {
  // Global smooth scroll helper (used by index.html and preferences.js)
  window.smoothScrollTo = window.smoothScrollTo || function (selector, offsetPx = 20) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - offsetPx;
    window.scrollTo({ top, behavior: "smooth" });
  };

  window.addEventListener("load", () => {
    // prevent any residual scroll from previous refreshes/anchors
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {}
  });


  // Ensure API_BASE exists for fetch calls
  window.API_BASE = window.API_BASE || "";

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