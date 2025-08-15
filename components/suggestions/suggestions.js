// suggestions.js (full)
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

let suggestions = {};    // {"1": {...}, "2": {...}}
let firstRank   = 1;     // first card shown in the center group

function pad2(x) { return String(x || "").padStart(2, "0"); }

function imagePathFor(sug) {
  const f2 = pad2(sug.stateFIPS);
  return `city_images/${f2}000.jpg`;          // <── correct folder
}

function displayHighlight(rankStr) {
  const sug = suggestions[rankStr];
  if (!sug) return;

  const city  = sug.cityName || "";
  const state = sug.stateName || "";
  const reasons = (sug.topFeatures || []).map(f => FEATURE_SUGGESTION_NAMES[f] || f);

  let reasonsHTML = reasons.map(r => `<li>${r}</li>`).join("");

  const element = `
    <h2 style="position:absolute; top:10px; left:0; color:#DBE4EE;">#${rankStr}</h2>
    <h1>${city},<br />${state}</h1>
    <p>You might like ${city} because of its...</p>
    <ul>${reasonsHTML}</ul>
  `;

  const imgEl = `
    <img src="${imagePathFor(sug)}"
         alt="City image"
         onerror="this.style.display='none';" />
  `;

  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.getElementById("highlight").innerHTML = element;
  doc.querySelector("div.suggestions-highlight-image").innerHTML = imgEl;
}

function displayResults(sliceObj, container) {
  let html = ``;
  for (const [rank, sug] of Object.entries(sliceObj)) {
    const city  = sug.cityName || "";
    const state = sug.stateName || "";
    const img   = imagePathFor(sug);
    const score = (sug.scaledScore != null) ? `<div style="position:absolute; bottom:8px; right:10px; color:#DBE4EE; opacity:.85; font-size:14px;">${sug.scaledScore}</div>` : "";

    html += `
      <div class="result" onclick="displayHighlight('${rank}')">
        <img src="${img}" onerror="this.style.display='none';" />
        <div class="tint"></div>
        <h1>${city}, ${state}</h1>
        <h2>${rank}</h2>
        ${score}
      </div>`;
  }

  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.querySelector("div.result-group." + container).innerHTML = html;
}

function updateCarousel() {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(suggestions).length;

  // left button only if there are previous items
  doc.querySelector("section.suggestions-results button.previous").style.display =
    (firstRank > 1) ? "block" : "none";

  // right button only if there are more after this window
  doc.querySelector("section.suggestions-results button.next").style.display =
    (firstRank + 5 <= total) ? "block" : "none";
}

function replaceClass(node, oldClass, newClass) {
  node.classList.remove(oldClass);
  node.classList.add(newClass);
}

function showResults(next) {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(suggestions).length;

  const left   = doc.querySelector(".result-group.left");
  const right  = doc.querySelector(".result-group.right");
  const middle = doc.querySelector(".result-group.middle");

  const btns = doc.querySelectorAll("section.suggestions-results button");
  btns.forEach(b => (b.disabled = true));

  if (next && firstRank + 5 <= total) {
    middle.style.transform = "translateX(-100%)";
    right.style.transform  = "translateX(0)";
    left.style.opacity     = "0";
    left.style.transform   = "translateX(100%)";

    setTimeout(() => {
      replaceClass(middle, "middle", "left");
      replaceClass(right, "right", "middle");
      replaceClass(left, "left", "right");

      left.style.opacity = "1";
      firstRank += 5;

      // prepare the new right window
      const start = firstRank + 4;
      const end   = Math.min(firstRank + 9, total);
      if (start < end) {
        const slice = Object.fromEntries(Object.entries(suggestions).slice(start, end));
        displayResults(slice, "right");
      }

      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);
  } else if (!next && firstRank > 1) {
    middle.style.transform = "translateX(100%)";
    left.style.transform   = "translateX(0)";
    right.style.opacity    = "0";
    right.style.transform  = "translateX(-100%)";

    setTimeout(() => {
      replaceClass(middle, "middle", "right");
      replaceClass(left, "left", "middle");
      replaceClass(right, "right", "left");

      right.style.opacity = "1";
      firstRank -= 5;

      // prepare the new left window
      if (firstRank > 1) {
        const start = Math.max(firstRank - 6, 0);
        const end   = firstRank - 1;
        const slice = Object.fromEntries(Object.entries(suggestions).slice(start, end));
        displayResults(slice, "left");
      }

      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);
  }
}

class Suggestions extends HTMLElement {
  constructor() { super(); }
  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(suggestionsTemplate.content.cloneNode(true));

    // optional save hook (keeps your existing UI button)
    const btn = shadowRoot.getElementById("savePdf");
    if (btn) btn.addEventListener("click", () => window.print());
  }
}
customElements.define('suggestions-component', Suggestions);

// expose for other components
window.displayHighlight = displayHighlight;
window.displayResults   = displayResults;
window.updateCarousel   = updateCarousel;
window.showResults      = showResults;
