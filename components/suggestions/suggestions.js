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
      <button id="savePdf" class="primary">Save PDF</button>
    </section>

    <section class="suggestions-results">
      <div class="result-group left" style="display:none"></div>
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

// shared state
window.suggestions = window.suggestions || {};
window.firstRank   = typeof window.firstRank === "number" ? window.firstRank : 1;

/* -------------------- helpers -------------------- */
function pad2(x){ return String(x || "").padStart(2, "0"); }
function imagePathFor(sug){ return `city_images/${pad2(sug.stateFIPS)}000.jpg`; }
function orderedEntries(){
  // ensure numeric order by rank key "1".."25"
  return Object.entries(window.suggestions)
    .sort((a,b)=>Number(a[0])-Number(b[0]));
}
function sliceByRank(startRank, count=5){
  const ent = orderedEntries();
  const i0 = Math.max(0, startRank - 1);
  return Object.fromEntries(ent.slice(i0, i0 + count));
}
function lastStartRank(){
  const total = Object.keys(window.suggestions).length;
  return Math.max(1, total - 4);
}
function scoreBadge(score){
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
function reasonsFrom(sug){
  let feats = (sug.topFeatures || []).slice(0,5);
  if (!feats.length && window.ratings){
    const pairs = Object.entries(window.ratings)
      .filter(([f])=>FEATURE_SUGGESTION_NAMES[f])
      .map(([f,imp])=>[Number(imp)||0, f])
      .sort((a,b)=>b[0]-a[0]).slice(0,5);
    feats = pairs.map(([,f])=>f);
  }
  if (!feats.length) feats = ["Amenities","Climate","Economic","Healthcare","Industry"];
  return feats.map(f=>FEATURE_SUGGESTION_NAMES[f] || f);
}

/* -------------------- rendering -------------------- */
function displayHighlight(rankStr){
  const sug = window.suggestions[rankStr];
  if (!sug) return;
  const city  = sug.cityName || "";
  const state = sug.stateName || "";

  const headerHTML = `
    <h2 style="position:absolute; top:10px; left:0; color:#DBE4EE; margin:0">#${rankStr}</h2>
    <h1 style="margin:0">${city},<br/>${state}</h1>
    <p>You might like ${city} because of its...</p>
    <ul>${reasonsFrom(sug).map(r=>`<li>${r}</li>`).join("")}</ul>
  `;
  const imgHTML = `
    <img src="${imagePathFor(sug)}" alt="City image" onerror="this.style.display='none';" />
  `;
  const scoreHTML = (sug.scaledScore != null)
    ? `<div style="position:absolute; top:150px; right:16px;
                  background:rgba(0,0,0,.35); padding:4px 8px; border-radius:10px;
                  color:#DBE4EE; font-size:13px; font-weight:600; border:1px solid rgba(255,255,255,.25);">
         ${sug.scaledScore}
       </div>` : "";

  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.getElementById("highlight").innerHTML = headerHTML;
  doc.querySelector("div.suggestions-highlight-image").innerHTML = imgHTML + scoreHTML;
}

// render a slice into a specific container (node or class name)
function displayResults(sliceObj, container){
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const target = (typeof container === "string")
    ? doc.querySelector("div.result-group."+container)
    : container;
  if (!target) return;

  let html = ``;
  for (const [rank, sug] of Object.entries(sliceObj)){
    const city = sug.cityName || "", state = sug.stateName || "", img = imagePathFor(sug);
    html += `
      <div class="result" onclick="displayHighlight('${rank}')">
        <img src="${img}" onerror="this.style.display='none';" />
        <div class="tint"></div>
        <h1>${city}, ${state}</h1>
        <h2>${rank}</h2>
        ${scoreBadge(sug.scaledScore)}
      </div>`;
  }
  target.innerHTML = html;
}

function updateCarousel(){
  const doc   = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(window.suggestions).length;
  const atStart = (window.firstRank <= 1);
  const atEnd   = (window.firstRank >= lastStartRank());

  // show/hide nav buttons
  doc.querySelector("section.suggestions-results button.previous").style.display = atStart ? "none" : "block";
  doc.querySelector("section.suggestions-results button.next").style.display     = atEnd   ? "none" : "block";

  // hide offstage groups at hard ends
  const left  = doc.querySelector(".result-group.left");
  const right = doc.querySelector(".result-group.right");
  left.style.display  = atStart ? "none" : "flex";
  right.style.display = atEnd   ? "none"  : "flex";
}

function resetTransforms(){
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const left   = doc.querySelector(".result-group.left");
  const middle = doc.querySelector(".result-group.middle");
  const right  = doc.querySelector(".result-group.right");
  if (left)   left.style.transform   = "translateX(-100%)";
  if (middle) middle.style.transform = "translateX(0)";
  if (right)  right.style.transform  = "translateX(100%)";
}

function setAllGroupOpacity(doc, value = "1") {
  const groups = doc.querySelectorAll(".result-group.left, .result-group.middle, .result-group.right");
  groups.forEach(g => g.style.opacity = value);
}

function showResults(next){
  const doc   = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const total = Object.keys(window.suggestions).length;
  const lastS = lastStartRank();

  const left0   = doc.querySelector(".result-group.left");
  const right0  = doc.querySelector(".result-group.right");
  const middle0 = doc.querySelector(".result-group.middle");

  const btns = doc.querySelectorAll("section.suggestions-results button");
  btns.forEach(b => (b.disabled = true));

  if (next){
    if (window.firstRank >= lastS){ updateCarousel(); btns.forEach(b=>b.disabled=false); return; }
    const nextFirst = Math.min(window.firstRank + 5, lastS);

    // PRE-RENDER incoming window into the source "right" group
    displayResults(sliceByRank(nextFirst), right0);

    // animate
    middle0.style.transform = "translateX(-100%)";
    right0.style.transform  = "translateX(0)";
    left0.style.opacity     = "0";
    left0.style.transform   = "translateX(100%)";

    setTimeout(() => {
      // rotate roles
      replaceClass(middle0, "middle", "left");
      replaceClass(right0,  "right",  "middle");
      replaceClass(left0,   "left",   "right");

      // re-query new roles **and restore opacity on all groups**
      const left   = doc.querySelector(".result-group.left");
      const right  = doc.querySelector(".result-group.right");
      const middle = doc.querySelector(".result-group.middle");
      setAllGroupOpacity(doc, "1");

      window.firstRank = nextFirst;

      // prepare the NEW right for the following step
      if (window.firstRank + 5 <= total){
        displayResults(sliceByRank(window.firstRank + 5), right);
        right.style.display = "flex";
      } else {
        right.innerHTML = "";
      }

      // normalize transforms & controls
      resetTransforms();
      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);

  } else {
    if (window.firstRank <= 1){ updateCarousel(); btns.forEach(b=>b.disabled=false); return; }
    const prevFirst = Math.max(1, window.firstRank - 5);

    // PRE-RENDER incoming window into the source "left" group
    displayResults(sliceByRank(prevFirst), left0);
    left0.style.display = "flex";

    // animate
    middle0.style.transform = "translateX(100%)";
    left0.style.transform   = "translateX(0)";
    right0.style.opacity    = "0";
    right0.style.transform  = "translateX(-100%)";

    setTimeout(() => {
      // rotate roles
      replaceClass(middle0, "middle", "right");
      replaceClass(left0,   "left",   "middle");
      replaceClass(right0,  "right",  "left");

      // re-query new roles **and restore opacity on all groups**
      const left   = doc.querySelector(".result-group.left");
      const right  = doc.querySelector(".result-group.right");
      const middle = doc.querySelector(".result-group.middle");
      setAllGroupOpacity(doc, "1");

      window.firstRank = prevFirst;

      // prepare the NEW left for the following step
      if (window.firstRank > 1){
        displayResults(sliceByRank(Math.max(1, window.firstRank - 5)), left);
        left.style.display = "flex";
      } else {
        left.innerHTML = "";
      }

      // normalize transforms & controls
      resetTransforms();
      updateCarousel();
      btns.forEach(b => (b.disabled = false));
    }, 750);
  }
}

function replaceClass(node, oldClass, newClass){
  node.classList.remove(oldClass);
  node.classList.add(newClass);
}

function initSuggestionsUI(){
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  const right = doc.querySelector(".result-group.right");
  const left  = doc.querySelector(".result-group.left");

  // initial windows
  displayResults(sliceByRank(1), "middle");
  const total = Object.keys(window.suggestions).length;
  if (total > 5){
    displayResults(sliceByRank(6), right);
    right.style.display = "flex";
  } else {
    right.style.display = "none";
    right.innerHTML = "";
  }
  left.style.display = "none";
  left.innerHTML = "";

  window.firstRank = 1;
  resetTransforms();
  displayHighlight("1");
  updateCarousel();
}

/* -------------------- PDF (table-based) -------------------- */
function buildSuggestionsTableHTML(){
  const rows = orderedEntries().map(([rank, sug]) => {
    const city = (sug.cityName || "").replace(/&/g,"&amp;").replace(/</g,"&lt;");
    const state= (sug.stateName || "").replace(/&/g,"&amp;").replace(/</g,"&lt;");
    const score= (sug.scaledScore != null ? String(sug.scaledScore) : "");
    const reasons = reasonsFrom(sug).join(", ");
    return `<tr>
      <td style="text-align:center;">${rank}</td>
      <td>${city}</td>
      <td>${state}</td>
      <td style="text-align:center;">${score}</td>
      <td>${reasons}</td>
    </tr>`;
  }).join("");

  // Clean, print-focused HTML (Letter; good defaults for most browsers’ “Save as PDF”)
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CityFinder — Top Matches</title>
  <style>
    @media print {
      @page { size: Letter portrait; margin: 16mm; }
      body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: Inter, system-ui, Segoe UI, Arial, sans-serif; color:#0b1220; }
    h1 { margin: 0 0 12px 0; font-size: 20px; }
    .meta { color:#4b5563; margin-bottom: 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    .small { font-size: 10px; color:#6b7280; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>CityFinder - Your Top Matches</h1>
  <div class="meta">Generated ${new Date().toLocaleString()}</div>
  <table>
    <thead>
      <tr>
        <th style="width:40px; text-align:center;">#</th>
        <th style="width:180px;">City</th>
        <th style="width:120px;">State</th>
        <th style="width:60px; text-align:center;">Score</th>
        <th>Top Reasons</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="small">Scores are 0-100 scaled globally; “Top Reasons” summarize your preferences and model signals.</div>
  <script>window.onload = () => { window.focus(); window.print(); setTimeout(() => window.close(), 250); };</script>
</body>
</html>`;
}

function exportSuggestionsPDF() {
  try {
    const html = buildSuggestionsTableHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;

    iframe.onload = () => {
      try {
        const w = iframe.contentWindow;
        if (!w) throw new Error("No iframe window");
        w.focus();
        // give layout a tick, then print
        setTimeout(() => w.print(), 10);
      } finally {
        // clean up after the print dialog opens
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 1500);
      }
    };

    document.body.appendChild(iframe);
  } catch (e) {
    console.error("PDF export failed:", e);
    alert("Sorry — couldn't create the PDF. Try again.");
  }
}

/* -------------------- web component -------------------- */
class Suggestions extends HTMLElement{
  connectedCallback(){
    const shadowRoot = this.attachShadow({ mode:'open' });
    shadowRoot.appendChild(suggestionsTemplate.content.cloneNode(true));
    const btn = shadowRoot.getElementById("savePdf");
    if (btn) btn.addEventListener("click", exportSuggestionsPDF); // ← use iframe-based print
  }
}
customElements.define('suggestions-component', Suggestions);

// expose for other components
window.displayHighlight = displayHighlight;
window.displayResults   = displayResults;
window.updateCarousel   = updateCarousel;
window.showResults      = showResults;
window.initSuggestionsUI= initSuggestionsUI;
// also expose in case you want to trigger via other UI
window.exportSuggestionsPDF = exportSuggestionsPDF;