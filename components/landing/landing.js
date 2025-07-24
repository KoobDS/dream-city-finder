// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

const landingTemplate = document.createElement('template');

landingTemplate.innerHTML = `
  <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="css/global.css">
  <link rel="stylesheet" type="text/css" href="components/landing/landing.css">

  <div class="landing-container">
    <!-- Logo, slogan, and "Get Started" button -->
    <div class="landing-content">
      <h1>CityFinder</h1>
      <h2>Discover your next destination.</h2>
      <button class="primary" onclick="smoothScrollTo('tools-component', 1000)">Get Started</button>
    </div>

    <!-- Bobbing arrow -->
    <i class="fa-solid fa-angle-down" onclick="smoothScrollTo('tools-component', 1000)"></i>
    
    <!-- Black tinted background video -->
    <div class="tint"></div>
    <video autoplay muted loop>
      <source src="assets/aerial.mp4" type="video/mp4">
    </video>
  </div>
`;

class Landing extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.appendChild(landingTemplate.content);
  }
}

customElements.define('landing-component', Landing);