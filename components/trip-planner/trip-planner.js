(() => {
  const OCEAN = "#1e3f66";
  const LAND  = "#2e8b57";
  const ROUTE = "#DB5461";
  const WIDTH = 1200, HEIGHT = 650;

  // Simple reinit guard (avoid double-mount if scripts run twice)
  let mountedOnce = false;

  // wait for d3 & topojson ------------------------------------------------
  (function readyGate() {
    if (!window.d3 || !window.topojson) {
      return setTimeout(readyGate, 30);
    }
    if (!mountedOnce) {
      mountedOnce = true;
      init();
    }
  })();

  function init() {
    // Mount INSIDE the tools component’s “Route my next trip!” panel
    let host = document.body;
    const tools = document.querySelector("tools-component");
    if (tools?.shadowRoot) {
      const sec = tools.shadowRoot.getElementById("whereToVisit");
      if (sec) {
        host = sec;
        sec.innerHTML = "";                    // remove placeholder
        sec.style.background = "transparent";  // kill giant blue slab
        sec.style.padding = "12px";
        sec.style.minHeight = "100vh";
      }
    }

    // Panel root
    const root = document.createElement("div");
    root.id = "trip-planner-root";
    root.style.minHeight = "92vh";
    host.appendChild(root);

    // UI -------------------------------------------------------------------
    const ui = document.createElement("div");
    ui.style.display = "flex";
    ui.style.gap = "8px";
    ui.style.flexWrap = "wrap";
    ui.style.alignItems = "flex-end";
    ui.style.marginBottom = "10px";
    root.appendChild(ui);

    // Inputs with explicit ch widths
    const home    = mkInput("Knoxville", "trip-home", "24ch");                // ~24 chars
    const stops   = mkInput("Atlanta, Chicago, New York", "trip-stops", "60ch"); // ~60 chars
    const planBtn = mkBtn("Plan", "trip-plan");
    const saveBtn = mkBtn("Save PNG", "trip-save");

    // Slight inset so buttons aren’t glued to the edge
    planBtn.style.marginLeft = "auto";
    planBtn.style.marginRight = "6px";

    const homeWrap  = labelWrap("Home City", home);
    const stopsWrap = labelWrap("Stops (comma-separated)", stops);

    homeWrap.style.flex  = "0 0 auto";
    stopsWrap.style.flex = "0 0 auto";

    ui.append(homeWrap, stopsWrap, planBtn, saveBtn);

    // SVG ------------------------------------------------------------------
    const svg = d3.select(root)
      .append("svg")
      .attr("id", "trip-svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("width", "85%")           // narrower box
      .attr("height", "86vh")         // a bit taller
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .style("display", "block")
      .style("margin", "0 auto")      // centered
      .style("background", OCEAN)
      .style("border-radius", "12px")
      .style("box-shadow", "0 6px 20px rgba(0,0,0,.25)");

    // REAL background so exports look identical
    svg.append("rect")
      .attr("class", "bg")
      .attr("x", 0).attr("y", 0)
      .attr("width", WIDTH).attr("height", HEIGHT)
      .attr("fill", OCEAN);

    const g = svg.append("g");

    // Projection + path (NaturalEarth1 is built-in; avoids extra plugin)
    const projection = d3.geoNaturalEarth1()
      .translate([WIDTH / 2, HEIGHT / 2])
      .scale(210);

    const geoPath = d3.geoPath().projection(projection);

    // Graticule
    g.append("path")
      .datum(d3.geoGraticule10())
      .attr("d", geoPath)
      .attr("fill", "none")
      .attr("stroke", "rgba(219,228,238,.15)")
      .attr("stroke-width", 0.7);

    // Basemap
    let landReady = false;
    (async function drawBasemap() {
      try {
        const res = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json", { mode: "cors" });
        const topo = await res.json();
        const land = topojson.feature(topo, topo.objects.countries);
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
        g.append("text")
          .attr("x", 20).attr("y", 36)
          .attr("fill", "#DBE4EE")
          .attr("font-family", "Inter, system-ui, sans-serif")
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

        const res = await fetch(`${window.API_BASE || ""}/api/route`, {
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

    // Save as PNG — query from *this* panel’s root so shadow DOM never blocks us
    saveBtn.addEventListener("click", () => {
      const el = root.querySelector("#trip-svg"); // <-- key change
      if (!el) {
        alert("Map not ready yet — try again in a moment.");
        return;
      }
      exportSvgAsPng(el, "trip-map.png", {
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: OCEAN
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
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("fill", "#DBE4EE")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0b0b0b")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.95);
  }

  // ---------- utils ----------
  function mkInput(placeholder, id, widthCss) {
    const i = document.createElement("input");
    i.id = id;
    i.placeholder = placeholder;
    i.style.padding = "8px 10px";
    i.style.border = "2px solid #DBE4EE";
    i.style.borderRadius = "10px";
    i.style.fontFamily = "Inter, system-ui, sans-serif";
    i.style.width = widthCss || "100%";  // explicit ch width when provided
    i.style.minWidth = "12ch";
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
    w.style.color = "#F8FAFC";         // higher contrast
    w.style.fontWeight = "600";
    w.style.fontFamily = "Inter, system-ui, sans-serif";
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

  // Export SVG → PNG (shadow-DOM safe, Firefox friendly)
  function exportSvgAsPng(svgEl, filename, { width, height, backgroundColor } = {}) {
    try {
      const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
      const vbW = vb[2] || svgEl.clientWidth || 1200;
      const vbH = vb[3] || svgEl.clientHeight || 650;
      const W = width  || vbW;
      const H = height || vbH;

      const ns = "http://www.w3.org/2000/svg";
      const clone = svgEl.cloneNode(true);
      clone.setAttribute("xmlns", ns);
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      clone.setAttribute("width", W);
      clone.setAttribute("height", H);

      if (backgroundColor && !clone.querySelector("rect.__export_bg__")) {
        const bg = document.createElementNS(ns, "rect");
        bg.setAttribute("class", "__export_bg__");
        bg.setAttribute("x", 0);
        bg.setAttribute("y", 0);
        bg.setAttribute("width", W);
        bg.setAttribute("height", H);
        bg.setAttribute("fill", backgroundColor);
        clone.insertBefore(bg, clone.firstChild);
      }

      const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n` + clone.outerHTML;
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url  = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);

        canvas.toBlob((b) => {
          const a = document.createElement("a");
          a.download = filename || "map.png";
          a.href = URL.createObjectURL(b);
          a.click();
          URL.revokeObjectURL(a.href);
        }, "image/png", 0.95);
      };
      img.onerror = (e) => {
        console.error("PNG export image load failed:", e);
        URL.revokeObjectURL(url);
        alert("Save failed (image load). See console.");
      };
      img.src = url;
    } catch (e) {
      console.error("PNG export failed:", e);
      alert("Save failed (see console).");
    }
  }
})();
