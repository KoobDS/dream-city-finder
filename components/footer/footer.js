// Reference: https://www.freecodecamp.org/news/reusable-html-components-how-to-reuse-a-header-and-footer-on-a-website/

const footerTemplate = document.createElement('template');

footerTemplate.innerHTML = `
    <link rel="stylesheet" type="text/css" href="assets/fontawesome-6.5.2/css/all.min.css">
    <link rel="stylesheet" type="text/css" href="css/global.css">
    <link rel="stylesheet" type="text/css" href="components/footer/footer.css">

    <footer>
      <p>Creators: Jovan Yoshioka, Benjamin Koob, Arwen Roach</p>
      <a href="https://docs.google.com/document/d/1P0lkOtinwPJFv0krgGYw9cnMFcGzl6vQDdPTS2l4qQg/edit?usp=sharing">Link to Bibliography</a>
    </footer>
`;

class Footer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.appendChild(footerTemplate.content);
  }
}

customElements.define('footer-component', Footer);
