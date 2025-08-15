// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

const toolsTemplate = document.createElement('template');

toolsTemplate.innerHTML = `
  <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="css/global.css">
  <link rel="stylesheet" type="text/css" href="components/tools/tools.css">

  <div class="tools-container">
    <!-- Tool selection buttons -->
    <button id="whereToLiveBtn" class="tools-select-btn" onclick="selectTool(this)">
      <img src="assets/city.jpg" alt="City skyline" />
      <div class="tint"></div>
      <h1><span>Find my</span><br/>dream city!</h1>
    </button>
    <button id="whereToVisitBtn" class="tools-select-btn" onclick="selectTool(this)">
      <img src="assets/beach.jpg" alt="Beach" />
      <div class="tint"></div>
      <h1><span>Route my</span><br/>next trip!</h1>
    </button>

    <!-- Find my dream city! -->
    <section id="whereToLive">
      <preferences-component></preferences-component>
    </section>

+    <!-- Route my next trip! -->
+    <section id="whereToVisit"></section>
  </div>
`;

/**
 * Controls tool (i.e., "Where to Live" vs. "Where to Visit") selection animation.
 * @param btnNode Clicked DOM button object, i.e. the tool selected.
 */
function selectTool(btnNode)
{
  // Expand button to full width of screen and "remove" hover effect.
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

function showToolPicker() {
  const tools = document.querySelector("tools-component");
  const sr = tools?.shadowRoot;
  if (sr) {
    const btns = sr.querySelectorAll(".tools-select-btn");
    btns.forEach((b) => {
      b.style.zIndex = 1;
      b.style.width = "50%";
      b.style.pointerEvents = "auto";
      const img = b.querySelector("img");
      if (img) img.style.transform = "";
    });
    const sections = sr.querySelectorAll("#whereToLive, #whereToVisit");
    sections.forEach((sec) => {
      sec.style.display = "none";
      sec.style.transform = "translateY(100%)";
    });
  }

  // also hide the suggestions overlay if it was left open
  const suggSR = document.querySelector("suggestions-component")?.shadowRoot;
  const cont = suggSR?.getElementById("suggestions-container");
  if (cont) cont.style.display = "none";
}
window.showToolPicker = showToolPicker;


