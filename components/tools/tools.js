// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

const toolsTemplate = document.createElement('template');

toolsTemplate.innerHTML = `
  <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="css/global.css">
  <link rel="stylesheet" type="text/css" href="components/tools/tools.css">
  
  <script src="components/preferences/preferences.js" type="text/javascript" defer></script>

  <div class="tools-container">
    <!-- Tool selection buttons -->
    <button id="whereToLiveBtn" class="tools-select-btn" onclick="selectTool(this)">
      <img src="assets/city.jpg" />
      <div class="tint"></div>
      <h1><span>Where to...</span><br/>Live</h1>
    </button>
    <button id="whereToVisitBtn" class="tools-select-btn" onclick="selectTool(this)">
      <img src="assets/beach.jpg" />
      <div class="tint"></div>
      <h1><span>Where to...</span><br/>Visit</h1>
    </button>

    <!-- Where to Live -->
    <section id="whereToLive">
      <preferences-component></preferences-component>
    </section>

    <!-- Where to Visit -->
    <section id="whereToVisit">
      <h1>This is currently unavailable.</h1>
    </section>
  </div>
`;

/**
 * Controls tool (i.e., "Where to Live" vs. "Where to Visit") selection animation.
 * @param btnNode Clicked DOM button object, i.e. the tool selected.
 */
function selectTool(btnNode)
{
  // Expand button to full width of screen and "remove" hover effect.
  // By "remove," make hover effect permanent.
  btnNode.style.zIndex = 2;
  btnNode.style.width = "100%";
  btnNode.querySelector("img").style.transform = "scale(1.1,1.1)";

  // Disable tool select buttons.
  var doc = document.getElementsByTagName("tools-component")[0].shadowRoot;
  var imgs = doc.querySelectorAll(".tools-select-btn");
  imgs[0].style.pointerEvents = "none";
  imgs[1].style.pointerEvents = "none";
  
  // Slide up (and show) corresponding tool section after button expansion animation is complete.
  var toolName = btnNode.id.substring(0, btnNode.id.length - 3); // last three characters are "Btn".
  var container = doc.getElementById(toolName);
  container.style.display = "block";
  setTimeout(function() {
    container.style.transform = "none";
  }, 750);
}

class Tools extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(toolsTemplate.content);
  }
}

customElements.define('tools-component', Tools);