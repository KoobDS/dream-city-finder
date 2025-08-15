// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

const landingTemplate = document.createElement('template');

landingTemplate.innerHTML = `
  <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
  <link rel="stylesheet" type="text/css" href="css/global.css">
  <link rel="stylesheet" type="text/css" href="components/landing/landing.css">

  <div class="landing-container">
    <!-- Logo, slogan, and "Get Started" button -->
    <div class="landing-content">
      <h1>CityFinder v2</h1>
      <h2>Find your dream city - then map the perfect route.</h2>
      <button id="getStartedBtn" class="primary">Get Started</button>
    </div>

    <!-- Bobbing arrow -->
    <i id="downArrow" class="fa-solid fa-angle-down"></i>
    
    <!-- Black tinted background video -->
    <div class="tint"></div>
    <video autoplay muted loop>
      <source src="assets/aerial.mp4" type="video/mp4">
    </video>
  </div>
`;

class Landing extends HTMLElement {
  constructor() { super(); }
  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(landingTemplate.content.cloneNode(true));

    const scrollToTools = () => {
      if (window.showToolPicker) try { window.showToolPicker(); } catch {}
      const target = document.querySelector('tools-component');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    shadowRoot.getElementById('getStartedBtn')?.addEventListener('click', scrollToTools);
    shadowRoot.getElementById('downArrow')?.addEventListener('click', scrollToTools);
  }
}

customElements.define('landing-component', Landing);