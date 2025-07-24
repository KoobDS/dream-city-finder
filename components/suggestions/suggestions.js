// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

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
        <div id="highlight" class="container">
          <!-- Populated by displayHighlight() -->
        </div>
      </div>
      <div class="suggestions-highlight-image">
        <!-- Populated by displayHighlight() -->
      </div>
    </section>
    <section class="suggestions-results">
      <div class="result-group left">
        <!-- Populated by displayResults() -->
      </div>
      <div class="result-group right">
        <!-- Populated by displayResults() -->
      </div>
      <div class="result-group middle">
        <!-- Populated by displayResults() -->
      </div>
      
      <button class="previous" onclick="showResults(false)">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button class="next" onclick="showResults(true)">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </section>
  </div>
`;

function displayHighlight(rank) {
  const data = suggestions[rank];

  const city = data['cityName'];
  const state = data['stateName'];
  const topFeatures = data['topFeatures'];

  if (data['stateFIPS'].length < 2) {
    data['stateFIPS'] = '0' + data['stateFIPS'];
  }
  const image = 'data/images/' + data['stateFIPS'] + '000.jpg';

  let reasons = ``;
  topFeatures.forEach((feature) => {
    reasons += `<li>`+ FEATURE_SUGGESTION_NAMES[feature] +`</li>`;
  });

  const element = `
    <h1>`+ city +`,<br />`+ state +`</h1>
    <h2>#`+ rank +`</h2>
    
    <div class="list-container">
      <p>You might like `+ city +` because of its...</p>
      <ul>
        `+ reasons +`
      </ul>
    </div>
  `;

  const imgElement = `<img src="`+ image +`" />`;

  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.getElementById("highlight").innerHTML = element;
  doc.querySelector("div.suggestions-highlight-image").innerHTML = imgElement;
}

/**
 * @param container Either "left", "middle", or "right".
 */
function displayResults(results, container) {
  let elements = ``;
  Object.entries(results).forEach((result) => {
    const city = result[1]['cityName'];
    const state = result[1]['stateName'];
    const rank = result[1]['rank'];
    if (result[1]['stateFIPS'].length < 2) {
      result[1]['stateFIPS'] = '0' + result[1]['stateFIPS'];
    }
    const image = 'data/images/' + result[1]['stateFIPS'] + '000.jpg';
    

    // Note: String cannot have spaces before/after div tags b/c it will cause unwanted padding.
    elements += 
      `<div class="result" onclick="displayHighlight(`+rank+`)">
        <img src="`+ image +`" />
        <div class="tint"></div>
        <h1>`+ city +`, `+ state +`</h1>
        <h2>`+ rank +`</h2>
      </div>`;
  });
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  doc.querySelector("div.result-group." + container).innerHTML = elements;
}

function updateCarousel() {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;
  
  // Remove left arrow if first result.
  if (firstRank == 1) {
    doc.querySelector("section.suggestions-results button.previous").style.display = "none";
  } else {
    doc.querySelector("section.suggestions-results button.previous").style.display = "block";
  }

  // Remove right arrow if no results are left.
  if (firstRank+5 > Object.entries(suggestions).length) {
    doc.querySelector("section.suggestions-results button.next").style.display = "none";
  } else {
    doc.querySelector("section.suggestions-results button.next").style.display = "block";
  }
}

/**
 * Helper function to replace class.
 * @param node Element node to replace classes.
 * @param oldClass Class that will be replaced.
 * @param newClass Class that will be replacing.
 */
function replaceClass(node, oldClass, newClass) {
  node.classList.remove(oldClass);
  node.classList.add(newClass);
}

/**
 * Animates transitioning to next or previous results.
 * @param next If true, show next results; false, show previous results.
 */
function showResults(next) {
  const doc = document.getElementsByTagName("suggestions-component")[0].shadowRoot;

  // Disable the transition button.
  var buttonNodes = doc.querySelectorAll("section.suggestions-results button");
  buttonNodes.forEach((node) => {
    node.disabled = true;
  });

  const left = doc.querySelector(".result-group.left");
  const right = doc.querySelector(".result-group.right");
  const middle = doc.querySelector(".result-group.middle");

  // Note: CSS attribute adds transition delay to below translation.
  if (next) {
    // Slide middle to left, right to middle, and move left to right.
    middle.style.transform = "translateX(-100%)";
    right.style.transform = "translateX(0)";
    left.style.opacity = "0.0";
    left.style.transform = "translateX(100%)";
  } else {
    // Slide middle to right, left to middle, and move right to left.
    middle.style.transform = "translateX(100%)";
    left.style.transform = "translateX(0)";
    right.style.opacity = "0.0";
    right.style.transform = "translateX(-100%)";
  }

  setTimeout(() => {
    // Update classes to reflect new positions.
    if (next) {
      replaceClass(middle, "middle", "left");
      replaceClass(right, "right", "middle");
      replaceClass(left, "left", "right");

      left.style.opacity = "1.0";
      
      firstRank += 5;

      // Initialize the right.
      if (!(firstRank+5 > Object.entries(suggestions).length)) {
        displayResults(Object.fromEntries(Object.entries(suggestions).slice(firstRank+4, firstRank+9)), "right");
      }
    } else {
      replaceClass(middle, "middle", "right");
      replaceClass(left, "left", "middle");
      replaceClass(right, "right", "left");

      right.style.opacity = "1.0";

      firstRank -= 5;

      // Initialize the left.
      if (!(firstRank == 1)) {
        displayResults(Object.fromEntries(Object.entries(suggestions).slice(firstRank-6, firstRank)), "left");
      }
    }

    // Update carousel buttons.
    updateCarousel();

    // Re-enable the transition button.
    buttonNodes.forEach((node) => {
      node.disabled = false;
    });
  }, 750);
}

class Suggestions extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(suggestionsTemplate.content);
  }
}

customElements.define('suggestions-component', Suggestions);