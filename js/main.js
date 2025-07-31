/*  CityFinder – front-end helpers
    --------------------------------
  Picks the right API base (Render in prod, same origin in dev)
  Exposes `window.API_BASE` for all components
*/

(() => {
  /* Detect where the SPA is running
     ─────────────────────────────── */
  const API_BASE = location.hostname.includes('github.io')
    ? 'https://cityfinder-api.onrender.com'   // ← replace with your Render URL
    : '';                                     // dev: same-origin Flask

  window.API_BASE = API_BASE;                 // global for fetch() calls

  /* Smooth-scroll utility (unchanged)
     ───────────────────────────────── */
  window.smoothScrollTo = function (target, duration = 600) {
    const elem = document.querySelector(target);
    if (!elem) return;

    const elementHeight = elem.offsetHeight;
    const windowHeight  = window.innerHeight;
    const targetPos     = elem.offsetTop - (windowHeight - elementHeight) / 2;
    const startPos      = window.pageYOffset;
    const distance      = targetPos - startPos;
    let   startTime     = null;

    const easeQuadIO = (t, b, c, d) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    const step = ts => {
      if (!startTime) startTime = ts;
      const ms = ts - startTime;
      window.scrollTo(0, easeQuadIO(ms, startPos, distance, duration));
      if (ms < duration) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };
})();
