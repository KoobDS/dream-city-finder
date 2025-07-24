// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

// Dictionary to keep dynamically updated ratings.
// Note: Initialize every feature as default rating "1" for suggestion algorithm.
const DEFAULT_RATING = "1";
const ratings = getDefaultRatings();

// Create button elements for each category.
const categoryButtons = createCategoryButtons(FEATURE_CATEGORIES);

const preferencesTemplateContent = `
    <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
    <link rel="stylesheet" type="text/css" href="css/global.css">
    <link rel="stylesheet" type="text/css" href="components/preferences/preferences.css">

    <div class="preferences-container">
      <h1>Preferences</h1>

      <div id="preferences-categories-container">
        <h2>Choose a category to select your home city preferences!</h2>
        <div class="container">`+
          categoryButtons
        +`</div>
      </div>
        
      <div id="preferences-rating-container">
        <h2>Please answer these questions to help us find the perfect city for you!</h2>
        <div id="response-rows">
          <!-- Populated by addQuestions() -->
        </div>
      </div>

      <div class="preferences-buttons">
        <button onclick="showCategories()" id="backBtn" class="primary"><i class="fa-solid fa-chevron-left"></i> Back</button>
        <button onclick="findCity()" id="findCityBtn" class="primary">Find City</button>
      </div>
    </div>
`;

function getDefaultRatings() {
  // Initialize each feature as default rating "3" (norm/inv_norm) or average (goldilock).
  const featureRatings = {};
  for (const [key, value] of Object.entries(FEATURES_CATEGORIZED)) {
    if (key in GOLDILOCK_FEATURE_RANGES) {
      // Initialize as median of values for goldilocks feature.
      // Note: mean not used since it is heavily influenced by outlier values.
      const data = GOLDILOCK_FEATURE_RANGES[key];
      const medianVal = data[3];
      featureRatings[key] = medianVal.toString();
    } else {
      // Initialize as default "3" for norm/inv_norm feature.
      featureRatings[key] = DEFAULT_RATING;
    }
  }
  return featureRatings;
}

function rateFeature(inputNode) {
  const feature = inputNode.name;
  const rating = inputNode.value;

  ratings[feature] = rating;
}

function handleSlider(sliderNode) {
  // Update rating dictionary with value.
  rateFeature(sliderNode);

  // Update displayed value.
  const doc = getDocNode();
  const feature = sliderNode.name;
  const rating = sliderNode.value;

  doc.getElementById(feature + "-display").innerHTML = rating;
}

function myFunction() {
  alert("I am an alert box!");
}

function getDocNode() {
  return document.getElementsByTagName("tools-component")[0].shadowRoot.querySelector("preferences-component").shadowRoot;
}

function createCategoryButtons(categories) {
  var buttonsHTML = ``;
  for (var i = 0; i < categories.length; i++) {
    buttonsHTML += `<button class="preferences-category" onclick="selectCategory('` + categories[i] + `')">` + categories[i] + `</button>`;
  }
  return buttonsHTML;
}

function addQuestions(category) {
  // Retrieve all features in passed category.
  const features = [];
  for (const [key, value] of Object.entries(FEATURES_CATEGORIZED)) {
    if (value == category) {
      features.push(key);
    }
  }

  // Create a "response-row" element for each of the features.
  var elements = ``;
  features.forEach((feature) => {
    // Retrieve question prompt based on norm/inv_norm/goldilocks type.
    const type = FEATURE_TYPES[feature];
    const question = FEATURE_TYPE_QUESTIONS[type];

    // Retrieve user-facing name for feature.
    // Note: display names capitalized like a title, so convert to lowercase for question sentence.
    const displayName = FEATURE_NAMES[feature].toLowerCase();

    // Determine which rating button to check based on feature's current rating.
    // Note: rating corresponds to index of "checked" array, which will add the "checked" attribute to respective radio button.
    const checked = ["", "", "", "", ""];
    checked[parseInt(ratings[feature])-1] = "checked";

    // Create HTML element with appropriate data.
    if (type != "gold") {
      // Add radio button for rating.
      elements += `
        <div class="response-row">
          <div class="text">
            <p>`+ question +` `+ displayName +`?</p>
          </div>
          <div class="right-side">
            <div class="labels">
              <p>Not Important</p>
              <p>Very Important</p>
            </div>
            <div class="buttons">
              <input type="radio" name="`+ feature +`" value="1" onchange="rateFeature(this)" `+ checked[0] +`>
              <input type="radio" name="`+ feature +`" value="2" onchange="rateFeature(this)" `+ checked[1] +`>
              <input type="radio" name="`+ feature +`" value="3" onchange="rateFeature(this)" `+ checked[2] +`>
              <input type="radio" name="`+ feature +`" value="4" onchange="rateFeature(this)" `+ checked[3] +`>
              <input type="radio" name="`+ feature +`" value="5" onchange="rateFeature(this)" `+ checked[4] +`>
            </div>
          </div>
        </div>
      `;
    } else {
      // Add slider to choose ideal value (for goldilock features).
      const data = GOLDILOCK_FEATURE_RANGES[feature];
      const minVal = data[0];
      const maxVal = data[1];
      const units = data[2];

      elements += `
        <div class="response-row">
          <div class="text">
            <p>`+ question +` `+ displayName +`?</p>
          </div>
          <div class="right-side">
            <div class="slider-container">
              <p class="slider-value">
                <span id="`+ feature +`-display">`+ ratings[feature] +`</span> `+ units +`
              </p>
              <input type="range" min="`+ minVal +`" max="`+ maxVal +`" value="`+ ratings[feature] +`" class="slider" name="`+ feature +`" oninput="handleSlider(this)">
            </div>
          </div>
        </div>
      `;
    }
  });

  // Add elements to the DOM.
  const doc = getDocNode();
  doc.getElementById("response-rows").innerHTML = elements;
}

function selectCategory(category) {
  const doc = getDocNode();

  // Hide category selection interface.
  doc.getElementById("preferences-categories-container").style.display = "none";

  // Add the passed category's questions to the rating interface.
  addQuestions(category);

  // Show rating interface (with category's questions added from above).
  doc.getElementById("preferences-rating-container").style.display = "block";
  doc.getElementById("backBtn").style.display = "inline-block";
}

function showCategories() {
  const doc = getDocNode();
  doc.getElementById("preferences-categories-container").style.display = "block";
  doc.getElementById("preferences-rating-container").style.display = "none";
  doc.getElementById("backBtn").style.display = "none";
}

function cleanData(data) {
  // Remove row if the city or state name is null.
  const cleaned = {};
  let rank = 1;
  for (var i = 1; i <= Object.entries(data).length; i++) {
    let city = data[i.toString()];
    if (!(city["cityName"] == "NaN" || city["stateName"] == "NaN")) {
      city["rank"] = rank;
      cleaned[rank] = city;
      rank++; // Next valid (i.e., not NaN) city will be the next rank.
    }
  }
  return cleaned;
}

let suggestions = {};
let firstRank = 1;

function findCity() {
  // Disable "Find City" button to prevent accidentally calling endpoint multiple times.
  const doc = getDocNode();
  doc.getElementById("findCityBtn").disabled = true;

  // Show the suggestions interface, ensuring the loading screen is shown.
  const suggestionsDoc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  suggestionsDoc.getElementById("suggestions-container").style.display = "block";
  suggestionsDoc.getElementById("loading-screen").style.pointerEvents = "auto";
  suggestionsDoc.getElementById("loading-screen").style.opacity = "1.0";

  // Scroll user to the suggestions interface to show them it is loading.
  smoothScrollTo('suggestions-component', 1000);

  // Call PythonAnywhere API endpoint.
  // Set the suggestions interface content based on results.
  const BASE_URL = "https://jyoshiok.pythonanywhere.com/"

  fetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(ratings),
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  })
    .then((res) => res.json())
    .then((data) => {

      suggestions = cleanData(data["suggestions"]);

      // Initialize the suggestions interface.
      firstRank = 1
      displayHighlight('1');
      displayResults(Object.fromEntries(Object.entries(suggestions).slice(0, 5)), "middle");
      displayResults(Object.fromEntries(Object.entries(suggestions).slice(5, 10)), "right");
      updateCarousel();

      // Show suggestions once all data is set.
      suggestionsDoc.getElementById("loading-screen").style.pointerEvents = "none";
      suggestionsDoc.getElementById("loading-screen").style.opacity = "0.0";

      // Re-enable "Find City" button to allow user to send another request.
      doc.getElementById("findCityBtn").disabled = false;
    })
    .catch((err) => {
      // Notify user of the error.
      alert("An error occurred! Please try again.");

      console.error(err);
    });
}

class Preferences extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const preferencesTemplate = document.createElement('template');
    preferencesTemplate.innerHTML = preferencesTemplateContent;
    
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(preferencesTemplate.content);
  }
}

customElements.define('preferences-component', Preferences);
