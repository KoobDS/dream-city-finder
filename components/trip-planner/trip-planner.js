const tpl = document.createElement('template');
tpl.innerHTML = `
  <link rel="stylesheet" href="css/global.css">
  <form id="tripForm">
    <label>Home <input name="home" required></label>
    <label>Stops (comma-sep) <input name="stops" required></label>
    <button>Plan</button>
  </form>
  <div id="map" style="width:100%;height:480px;margin-top:1rem"></div>
`;

class TripPlanner extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode:'open'}).append(tpl.content.cloneNode(true));
    this.shadowRoot.querySelector('#tripForm')
        .addEventListener('submit', e => this.submit(e));
  }

  async submit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      home:  f.get('home'),
      stops: f.get('stops').split(',').map(s=>s.trim()).filter(Boolean)
    };
    const res  = await fetch('/api/route', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();          // {order, coordinates}
    this.draw(data);
  }

  draw({order, coordinates}) {
    // quick Leaflet render – assumes leaflet.js already loaded in index.html
    if (!this.map) {
      const L = window.L;
      this.map = L.map(this.shadowRoot.querySelector('#map'))
                  .setView([39,-98], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'© OSM'
      }).addTo(this.map);
    }
    this.map.eachLayer(l=>{ if(l._latlng) this.map.removeLayer(l); });
    const pts = order.map(c=>[coordinates[c][0], coordinates[c][1]]);
    pts.forEach(p=>L.marker(p).addTo(this.map));
    L.polyline(pts,{dashArray:'4'}).addTo(this.map);
    this.map.fitBounds(pts);
  }
}
customElements.define('trip-planner-component', TripPlanner);
