const suggestionsTemplate = document.createElement('template');

suggestionsTemplate.innerHTML = `
  <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="css/global.css">
  <link rel="stylesheet" type="text/css" href="components/suggestions/suggestions.css">

  <div id="suggestions-container">
    <div id="loading-screen">
      <img src="assets/loading_icon.gif" />
    </div>

    <section class="suggestions-highlight">
      <div class="suggestions-highlight-content">
        <div id="highlight" class="container"></div>
      </div>
      <div class="suggestions-highlight-image"></div>
      <button id="savePdf" class="primary" style="position:absolute; top:8px; right:8px;">Save PDF</button>
    </section>

    <section class="suggestions-results">
      <div class="result-group left"></div>
      <div class="result-group middle"></div>
      <div class="result-group right"></div>

      <button class="previous" onclick="showResults(false)">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button class="next" onclick="showResults(true)">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </section>
  </div>
`;

// global storage (set by preferences.js)
window.suggestions = window.suggestions || {};
window.firstRank   = typeof window.firstRank === "number" ? window.firstRank : 1;

/* ────────────────────────────────────────────────────────
   helpers
   ──────────────────────────────────────────────────────── */
function pad2(x) { return String(x || "").padStart(2, "0"); }
function imagePathFor(sug) {
  const f2 = pad2(sug.stateFIPS);
  return `city_images/${f2}000.jpg`;
}
function scoreBadge(score) {
  if (score == null || score === "") return "";
  return `<div class="score-badge" style="
      position:absolute; bottom:8px; right:10px;
      background:rgba(0,0,0,.35); backdrop-filter:saturate(180%) blur(4px);
      border:1px solid rgba(255,255,255,.25);
      border-radius:10px; padding:4px 8px;
      color:#DBE4EE; font-size:13px; font-weight:600;">
      ${score}
    </div>`;
}

// Turn any feature code or label into a nice label
function prettyLabel(keyOrText) {
  if (!keyOrText) return "";
  // Prefer explicit mapping if available
  if (typeof FEATURE_SUGGESTION_NAMES === "object" && FEATURE_SUGGESTION_NAMES[keyOrText]) {
    return FEATURE_SUGGESTION_NAMES[keyOrText];
  }
  // Otherwise, make a readable guess
  const s = String(keyOrText).replace(/[_\-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Pull the best available reason list from the suggestion object
function rawReasonsArray(sug) {
  // accept many common field names
  const candidates = [
    "topFeatures", "top_features",
    "reasons", "why",
    "feature_names", "features"
  ];
  for (const k of candidates) {
    if (Array.isArray(sug?.[k]) && sug[k].length) return sug[k];
  }
  return [];
}

function reasonsFrom(sug) {
  // 1) backend-provided (best; per-city)
  let feats = rawReasonsArray(sug);
  // 2) last-resort fallback from user ratings (city-agnostic)
  if (!feats.length && window.ratings) {
    const pairs = Object.entries(window.ratings)
      .filter(([f]) => FEATURE_SUGGESTION_NAMES && FEATURE_SUGGESTION_NAMES[f])
      .map(([f, imp]) => [Number(imp) || 0, f])
      .sort((a, b) => b[0] - a[0])
      .slice(0, 5);
    feats = pairs.map(([, f]) => f);
  }
  // 3) absolute fallback
  if (!feats.length) feats = ["Amenities", "Climate", "Economy", "Healthcare", "Recreation"];
  return feats.slice(0, 5).map(prettyLabel);
}

/* ────────────────────────────────────────────────────────
   rendering
   ──────────────────────────────────────────────────────── */
function displayHighlight(rankStr) {
  const sug = window.suggestions[rankStr];
  if (!sug) return;

  const city  = sug.cityName || "";
  const state = sug.stateName || "";
  const reasons = reasonsFrom(sug);
  const reasonsHTML = reasons.map(r => `<li>${r}</li>`).join("");

  const headerHTML = `
    <h2 style="position:absolute; top:10px; left:0; color:#DBE4EE; margin:0">#${rankStr}</h2>
    <h1 style="margin:0">${city},<br/>${state}</h1>
    <p>You might like ${city} because of its...</p>
    <ul>${reasonsHTML}</ul>
  `;

  const imgHTML = `
    <img src="${imagePathFor(sug)}" alt="City image"
         onerror="this.style.display='none';" />
  `;
  const scoreHTML = (sug.scaledScore != null)
    ? `<div style="position:absolute; top:8px; right:12px;
                  background:rgba(0,0,0,.35); padding:4px 8px; border-radius:10px;
                  color:#DBE4EE; font-size:13px; font-weight:600; border:1px solid rgba(255,255,255,.25);">
         ${sug.scaledScore}
       </div>`
    : "";

  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.getElementById("highlight").innerHTML = headerHTML;
  doc.querySelector("div.suggestions-highlight-image").innerHTML = imgHTML + scoreHTML;
}

function displayResults(sliceObj, container) {
  let html = ``;
  for (const [rank, sug] of Object.entries(sliceObj)) {
    const city  = sug.cityName || "";
    const state = sug.stateName || "";
    const img   = imagePathFor(sug);
    html += `
      <div class="result" onclick="displayHighlight('${rank}')">
        <img src="${img}" onerror="this.style.display='none';" />
        <div class="tint"></div>
        <h1>${city}, ${state}</h1>
        <h2>${rank}</h2>
        ${scoreBadge(sug.scaledScore)}
      </div>`;
  }
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.querySelector("div.result-group." + container).innerHTML = html;
}

function updateCarousel() {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(window.suggestions).length;
  doc.querySelector("section.suggestions-results button.previous").style.display =
    (window.firstRank > 1) ? "block" : "none";
  doc.querySelector("section.suggestions-results button.next").style.display =
    (window.firstRank + 5 <= total) ? "block" : "none";
}

function replaceClass(node, oldClass, newClass) {
  node.classList.remove(oldClass);
  node.classList.add(newClass);
}

function showResults(next) {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(window.suggestions).length;

  const left   = doc.querySelector(".result-group.left");
  const right  = doc.querySelector(".result-group.right");
  const middle = doc.querySelector(".result-group.middle");

  const btns = doc.querySelectorAll("section.suggestions-results button");
  btns.forEach(b => (b.disabled = true));

  if (next && window.firstRank + 5 <= total) {
    middle.style.transform = "translateX(-100%)";
    right.style.transform  = "translateX(0)";
    left.style.opacity     = "0";
    left.style.transform   = "translateX(100%)";

    setTimeout(() => {
      replaceClass(middle, "middle", "left");
      replaceClass(right, "right", "middle");
      replaceClass(left, "left", "right");

      left.style.opacity = "1";
      window.firstRank += 5;

      const start = window.firstRank + 4;
      const end   = Math.min(window.firstRank + 9, total);
      if (start < end) {
        const slice = Object.fromEntries(Object.entries(window.suggestions).slice(start, end));
        displayResults(slice, "right");
      }
      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);
  } else if (!next && window.firstRank > 1) {
    middle.style.transform = "translateX(100%)";
    left.style.transform   = "translateX(0)";
    right.style.opacity    = "0";
    right.style.transform  = "translateX(-100%)";

    setTimeout(() => {
      replaceClass(middle, "middle", "right");
      replaceClass(left, "left", "middle");
      replaceClass(right, "right", "left");

      right.style.opacity = "1";
      window.firstRank -= 5;

      if (window.firstRank > 1) {
        const start = Math.max(window.firstRank - 6, 0);
        const end   = window.firstRank - 1;
        const slice = Object.fromEntries(Object.entries(window.suggestions).slice(start, end));
        displayResults(slice, "left");
      }
      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);
  }
}

function initSuggestionsUI() {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const entries = Object.entries(window.suggestions);
  // 1–5 in middle
  displayResults(Object.fromEntries(entries.slice(0, 5)), "middle");
  // prep right for 6–10
  displayResults(Object.fromEntries(entries.slice(5, 10)), "right");
  // select #1
  displayHighlight("1");
  updateCarousel();
}

/* ────────────────────────────────────────────────────────
   Printable TABLE report (Save PDF)
   ──────────────────────────────────────────────────────── */
function buildPrintableTableHTML() {
  const rows = Object.entries(window.suggestions)
    .sort((a,b) => Number(a[0]) - Number(b[0]))
    .map(([rank, sug]) => {
      const city  = sug.cityName || "";
      const state = sug.stateName || "";
      const score = (sug.scaledScore != null) ? String(sug.scaledScore) : "";
      const reasons = reasonsFrom(sug).join(", ");
      return `
        <tr>
          <td style="text-align:right;">${rank}</td>
          <td>${city}</td>
          <td>${state}</td>
          <td style="text-align:center;">${score}</td>
          <td>${reasons}</td>
        </tr>`;
    }).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>City suggestions</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; color:#0b1220; margin:24px; }
    h1 { font-size: 22px; margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border:1px solid #cfd8e3; padding:8px 10px; vertical-align: top; }
    th { background:#eef2f7; text-align:left; }
    tfoot td { border:none; padding-top:16px; color:#5b6b7a; font-size:12px; }
    @media print {
      @page { margin: 16mm; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <h1>Top City Suggestions</h1>
  <table>
    <thead>
      <tr>
        <th style="width:48px; text-align:right;">#</th>
        <th style="width:220px;">City</th>
        <th style="width:160px;">State</th>
        <th style="width:70px; text-align:center;">Score</th>
        <th>Top reasons</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <tfoot><tr><td colspan="5">Generated by CityFinder</td></tr></tfoot>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 250); };</script>
</body>
</html>`;
}

function openPrintableReport() {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups to save the PDF."); return; }
  w.document.open();
  w.document.write(buildPrintableTableHTML());
  w.document.close();
}

/* ────────────────────────────────────────────────────────
   web component
   ──────────────────────────────────────────────────────── */
class Suggestions extends HTMLElement {
  constructor() { super(); }
  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(suggestionsTemplate.content.cloneNode(true));
    const btn = shadowRoot.getElementById("savePdf");
    if (btn) btn.addEventListener("click", openPrintableReport);
  }
}
customElements.define('suggestions-component', Suggestions);

// expose for other components
window.displayHighlight  = displayHighlight;
window.displayResults    = displayResults;
window.updateCarousel    = updateCarousel;
window.showResults       = showResults;
window.initSuggestionsUI = initSuggestionsUI;
