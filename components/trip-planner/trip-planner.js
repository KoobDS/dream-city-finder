(() => {
  const OCEAN = "#1e3f66";
  const LAND  = "#2e8b57";
  const ROUTE = "#DB5461";
  const WIDTH = 1200, HEIGHT = 650;

  // --- wait for d3 & topojson ------------------------------------------------
  (function readyGate() {
    if (!window.d3 || !window.topojson) {
      return setTimeout(readyGate, 30);
    }
    init(); // libs are ready
  })();

  function init() {
    // Pick/insert host
    const host = document.querySelector("trip-planner") || document.body;
    let root = document.getElementById("trip-planner");
    if (!root) {
      root = document.createElement("section");
      root.id = "trip-planner";
      root.style.padding = "16px";
      host.appendChild(root);
    }
    root.innerHTML = "";

    // UI
    const ui = document.createElement("div");
    ui.style.display = "flex";
    ui.style.gap = "8px";
    ui.style.flexWrap = "wrap";
    ui.style.marginBottom = "10px";

    const home   = mkInput("Knoxville", "trip-home");
    const stops  = mkInput("Atlanta, Chicago, New York", "trip-stops");
    const planBtn = mkBtn("Plan", "trip-plan");
    const saveBtn = mkBtn("Save PNG", "trip-save");

    ui.append(labelWrap("Home", home),
              labelWrap("Stops (comma-separated)", stops),
              planBtn, saveBtn);
    root.appendChild(ui);

    // SVG
    const svg = d3.select(root)
      .append("svg")
      .attr("id", "trip-svg")
      .attr("width", "100%")
      .attr("height", "62vh")
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .style("display", "block")
      .style("background", OCEAN)
      .style("border-radius", "12px")
      .style("box-shadow", "0 6px 20px rgba(0,0,0,.25)");

    const g = svg.append("g");

    // Projection + path (note the v7 style)
    const projection = d3.geoMollweide()
        // const projection = d3.geoHammer().translate([WIDTH/2, HEIGHT/2]).scale(210);
      .translate([WIDTH / 2, HEIGHT / 2])
      .scale(210); // a tad larger for framing


    const geoPath = d3.geoPath().projection(projection);

    // Graticule (optional visual cue)
    const graticule = d3.geoGraticule10();
    g.append("path")
      .datum(graticule)
      .attr("d", geoPath)
      .attr("fill", "none")
      .attr("stroke", "rgba(219,228,238,.15)")
      .attr("stroke-width", 0.7);

    // Basemap
    let landReady = false;
    (async function drawBasemap() {
      try {
        const res = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json", { mode: "cors" });
        if (!res.ok) throw new Error(`world-atlas HTTP ${res.status}`);
        const topo = await res.json();
        const land = topojson.feature(topo, topo.objects.countries);

        // Draw all countries as one path (FeatureCollection is fine)
        g.append("path")
          .datum(land)
          .attr("d", geoPath)
          .attr("fill", LAND)
          .attr("stroke", "#b8c2cc")
          .attr("stroke-width", 0.4)
          .attr("opacity", 0.95);

        landReady = true;
      } catch (err) {
        console.error("Basemap load failed:", err);
        // Visible hint so you don’t miss it during demos
        g.append("text")
          .attr("x", 20).attr("y", 36)
          .attr("fill", "#DBE4EE")
          .attr("font-family", "TiltNeon, system-ui, sans-serif")
          .attr("font-size", 16)
          .text("Basemap failed to load (check console / network)");
      }
    })();

    // Plan route
    planBtn.addEventListener("click", async () => {
      const homeCity = home.value.trim();
      const stopList = stops.value.split(",").map(s => s.trim()).filter(Boolean);
      if (!homeCity) return alert("Please enter a home city.");
      try {
        planBtn.disabled = true;
        planBtn.textContent = "Planning…";

        const res = await fetch(`${window.API_BASE}/api/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ home: homeCity, stops: stopList })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        await waitFor(() => landReady, 5000);
        drawRoute(g, projection, geoPath, data);
        planBtn.textContent = "Plan";
      } catch (err) {
        console.error(err);
        alert(`Trip error: ${err.message}`);
        planBtn.textContent = "Plan";
      } finally {
        planBtn.disabled = false;
      }
    });

    // Save
    saveBtn.addEventListener("click", () => {
      exportSvgAsPng(document.getElementById("trip-svg"), "trip-map.png", {
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: OCEAN,
      });
    });
  }

  // ---------- drawing route ----------
  function drawRoute(g, projection, geoPath, data) {
    g.selectAll(".route, .city, .label").remove();

    const coords = data.coordinates || {};
    const order  = data.order || Object.keys(coords);

    const pts = order.map(name => {
      const v = coords[name];
      if (!v) return null;
      const [lat, lon] = v;
      const xy = projection([lon, lat]);
      return xy ? { name, lat, lon, x: xy[0], y: xy[1] } : null;
    }).filter(Boolean);

    // Pairwise segments as LineStrings (geoPath handles resampling on projection)
    const lines = [];
    for (let i = 0; i < pts.length - 1; i++) {
      lines.push({
        type: "LineString",
        coordinates: [[pts[i].lon, pts[i].lat], [pts[i + 1].lon, pts[i + 1].lat]]
      });
    }

    g.selectAll(".route")
      .data(lines).enter()
      .append("path")
      .attr("class", "route")
      .attr("d", geoPath)
      .attr("fill", "none")
      .attr("stroke", ROUTE)
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.95);

    g.selectAll(".city")
      .data(pts).enter()
      .append("circle")
      .attr("class", "city")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 4.5)
      .attr("fill", "#fff")
      .attr("stroke", "#222")
      .attr("stroke-width", 1);

    g.selectAll(".label")
      .data(pts).enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => d.x + 7)
      .attr("y", d => d.y - 7)
      .text(d => d.name)
      .attr("font-size", 11)
      .attr("font-family", "TiltNeon, system-ui, sans-serif")
      .attr("fill", "#DBE4EE")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0b0b0b")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.95);
  }

  // ---------- utils ----------
  function mkInput(placeholder, id) {
    const i = document.createElement("input");
    i.id = id; i.placeholder = placeholder;
    i.style.padding = "6px 8px";
    i.style.border = "2px solid #DBE4EE";
    i.style.borderRadius = "8px";
    i.style.fontFamily = "TiltNeon";
    i.style.minWidth = "240px";
    return i;
  }
  function mkBtn(text, id) {
    const b = document.createElement("button");
    b.id = id; b.textContent = text;
    b.className = "primary";
    b.style.padding = "6px 14px";
    return b;
  }
  function labelWrap(label, el) {
    const w = document.createElement("label");
    w.style.display = "flex";
    w.style.flexDirection = "column";
    w.style.gap = "4px";
    w.style.color = "#DBE4EE";
    w.style.fontFamily = "TiltNeon";
    w.append(label, el);
    return w;
  }
  function waitFor(condFn, timeoutMs) {
    return new Promise((resolve, reject) => {
      const t0 = performance.now();
      (function check() {
        if (condFn()) return resolve();
        if (performance.now() - t0 > timeoutMs) return reject(new Error("Timeout"));
        requestAnimationFrame(check);
      })();
    });
  }
  function exportSvgAsPng(svgEl, filename, { width, height, backgroundColor } = {}) {
    try {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width || svgEl.viewBox.baseVal.width || svgEl.clientWidth;
        canvas.height = height || svgEl.viewBox.baseVal.height || svgEl.clientHeight;
        const ctx = canvas.getContext("2d");
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          const a = document.createElement("a");
          a.download = filename || "map.png";
          a.href = URL.createObjectURL(blob);
          a.click();
          URL.revokeObjectURL(a.href);
        }, "image/png", 0.95);
      };
      img.src = "data:image/svg+xml;base64," + svg64;
    } catch (e) {
      console.error("PNG export failed:", e);
      alert("Save failed (see console).");
    }
  }
})();