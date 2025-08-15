const DEFAULT_RATING = "1";
let   ratings        = getDefaultRatings();
window.ratings       = ratings; // expose for suggestions.js (reasons fallback)

// Build the category button strip once
const categoryButtons = createCategoryButtons(FEATURE_CATEGORIES);

// Template
const preferencesTemplateContent = `
  <link rel="stylesheet" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="components/preferences/preferences.css">

  <div class="preferences-container">
    <h1>Preferences:</h1>

    <div id="preferences-categories-container">
      <p class="lead">Answer questions in each category for the best result!</p>
      <div class="container">${categoryButtons}</div>
    </div>
      
    <div id="preferences-rating-container">
      <h2>Please answer these questions to help us find the perfect city for you!</h2>
      <div id="response-rows"><!-- Populated by addQuestions() --></div>
    </div>

    <div class="preferences-buttons">
      <button onclick="showCategories()" id="backBtn" class="primary">
        <i class="fa-solid fa-chevron-left"></i> Back
      </button>
      <button onclick="findCity()" id="findCityBtn" class="primary">Find City</button>
    </div>
  </div>
`;

/* ----------------------------- helpers ----------------------------- */
function getDocNode() {
  const tools = document.querySelector("tools-component");
  if (!tools || !tools.shadowRoot) return null;
  const pref = tools.shadowRoot.querySelector("preferences-component");
  if (!pref || !pref.shadowRoot) return null;
  return pref.shadowRoot;
}

function getDefaultRatings() {
  const featureRatings = {};
  Object.entries(FEATURES_CATEGORIZED).forEach(([key]) => {
    if (key in GOLDILOCK_FEATURE_RANGES) {
      const data = GOLDILOCK_FEATURE_RANGES[key]; // [min, max, units, median]
      featureRatings[key] = String(data[3]);
    } else {
      featureRatings[key] = DEFAULT_RATING;
    }
  });
  return featureRatings;
}

function rateFeature(inputNode) {
  ratings[inputNode.name] = inputNode.value;
  window.ratings = ratings;
}

function handleSlider(sliderNode) {
  rateFeature(sliderNode);
  const doc = getDocNode();
  if (!doc) return;
  doc.getElementById(sliderNode.name + "-display").textContent = sliderNode.value;
}

function createCategoryButtons(categories) {
  return categories.map(cat =>
    `<button class="preferences-category" onclick="selectCategory('${cat}')">${cat}</button>`
  ).join("");
}

/* --------------------------- questionnaire -------------------------- */
function addQuestions(category) {
  const features = [];
  Object.entries(FEATURES_CATEGORIZED).forEach(([feature, cat]) => {
    if (cat === category) features.push(feature);
  });

  let html = ``;

  features.forEach((feature) => {
    const type     = FEATURE_TYPES[feature];                // 'norm' | 'inv_norm' | 'gold'
    const question = FEATURE_TYPE_QUESTIONS[type];
    const disp     = (FEATURE_NAMES[feature] || feature).toLowerCase();

    if (type !== "gold") {
      const checked = ["", "", "", "", ""];
      checked[(parseInt(ratings[feature] || DEFAULT_RATING, 10) - 1)] = "checked";
      html += `
        <div class="response-row">
          <div class="text"><p>${question} ${disp}?</p></div>
          <div class="right-side">
            <div class="labels"><p>Not Important</p><p>Very Important</p></div>
            <div class="buttons">
              <input type="radio" name="${feature}" value="1" onchange="rateFeature(this)" ${checked[0]}>
              <input type="radio" name="${feature}" value="2" onchange="rateFeature(this)" ${checked[1]}>
              <input type="radio" name="${feature}" value="3" onchange="rateFeature(this)" ${checked[2]}>
              <input type="radio" name="${feature}" value="4" onchange="rateFeature(this)" ${checked[3]}>
              <input type="radio" name="${feature}" value="5" onchange="rateFeature(this)" ${checked[4]}>
            </div>
          </div>
        </div>`;
    } else {
      const [minVal, maxVal, units] = GOLDILOCK_FEATURE_RANGES[feature];
      const val = ratings[feature];
      html += `
        <div class="response-row">
          <div class="text"><p>${question} ${disp}?</p></div>
          <div class="right-side">
            <div class="slider-container">
              <p class="slider-value">
                <span id="${feature}-display">${val}</span> ${units}
              </p>
              <input type="range" min="${minVal}" max="${maxVal}" value="${val}"
                     class="slider" name="${feature}" oninput="handleSlider(this)">
            </div>
          </div>
        </div>`;
    }
  });

  const doc = getDocNode();
  if (!doc) return;
  doc.getElementById("response-rows").innerHTML = html;
}

function selectCategory(category) {
  const doc = getDocNode();
  if (!doc) return;
  doc.getElementById("preferences-categories-container").style.display = "none";
  addQuestions(category);
  doc.getElementById("preferences-rating-container").style.display = "block";
  doc.getElementById("backBtn").style.display = "inline-block";
}

function showCategories() {
  const doc = getDocNode();
  if (!doc) return;
  doc.getElementById("preferences-categories-container").style.display = "block";
  doc.getElementById("preferences-rating-container").style.display = "none";
  doc.getElementById("backBtn").style.display = "none";
}

/* --------------------------- API integration ------------------------- */
function findCity() {
  const doc = getDocNode();
  if (!doc) return;

  const btn = doc.getElementById("findCityBtn");
  btn.disabled = true;

  // Suggestions overlay
  const sugComp = document.querySelector("suggestions-component");
  if (!sugComp || !sugComp.shadowRoot) {
    console.error("suggestions-component missing");
    btn.disabled = false;
    return;
  }
  const sdoc = sugComp.shadowRoot;
  sdoc.getElementById("suggestions-container").style.display = "block";
  sdoc.getElementById("loading-screen").style.pointerEvents = "auto";
  sdoc.getElementById("loading-screen").style.opacity = "1.0";

  // Provide a local smoothScrollTo if not already defined globally
  if (!window.smoothScrollTo) {
    window.smoothScrollTo = function (selector, offsetPx = 20) {
      const el = typeof selector === "string" ? document.querySelector(selector) : selector;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offsetPx;
      window.scrollTo({ top, behavior: "smooth" });
    };
  }

  smoothScrollTo('suggestions-component', 900);

  const url = (window.API_BASE || "") + "/api/suggest";
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: ratings, limit: 25 })
  })
    .then(async (res) => {
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error("Non-JSON response: " + text.slice(0, 300)); }
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      return data;
    })
    .then((data) => {
      window.suggestions = data.suggestions || {};
      window.firstRank   = 1;

      // One clean init only
      initSuggestionsUI();

      // hide overlay
      sdoc.getElementById("loading-screen").style.pointerEvents = "none";
      sdoc.getElementById("loading-screen").style.opacity = "0.0";
      btn.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      alert("An error occurred! Please try again.");
      sdoc.getElementById("loading-screen").style.pointerEvents = "none";
      sdoc.getElementById("loading-screen").style.opacity = "0.0";
      btn.disabled = false;
    });
}

/* --------------------------- web component --------------------------- */
class Preferences extends HTMLElement {
  connectedCallback() {
    const tpl = document.createElement('template');
    tpl.innerHTML = preferencesTemplateContent;
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(tpl.content.cloneNode(true));
  }
}
customElements.define('preferences-component', Preferences);

// Expose handlers used inline
window.rateFeature    = rateFeature;
window.handleSlider   = handleSlider;
window.selectCategory = selectCategory;
window.showCategories = showCategories;
window.findCity       = findCity;