from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import logging

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

app = Flask(__name__, static_folder=None)
CORS(app)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cityfinder")

# ─────────────────────────────────────────────────────────
# API first
# ─────────────────────────────────────────────────────────
from suggestion_algo import suggest_top_cities
from trip_mapper import build_route

@app.post("/api/suggest")
def api_suggest():
    payload = request.get_json(silent=True) or {}
    prefs = payload.get("preferences") or {}
    top = int(payload.get("top", 10))
    results = suggest_top_cities(prefs, top_n=top)

    suggestions = {}
    for i, item in enumerate(results, start=1):
        # normalize item -> (city, state)
        if isinstance(item, str):
            if "," in item:
                city_part, state_part = item.split(",", 1)
            else:
                city_part, state_part = item, ""
        elif isinstance(item, dict):
            city_part  = (item.get("cityName") or item.get("city_ascii")
                          or item.get("city") or "")
            state_part = (item.get("stateName") or item.get("State")
                          or item.get("state") or "")
        else:
            city_part, state_part = str(item), ""

        suggestions[str(i)] = {
            "cityName": city_part.strip(),
            "stateName": state_part.strip(),
            "stateFIPS": "",     # fill later if you wire it up
            "topFeatures": []    # fill later if needed
        }

    return jsonify({"suggestions": suggestions})

@app.post("/api/route")
def api_route():
    payload = request.get_json(silent=True) or {}
    home = payload.get("home", "")
    stops = payload.get("stops", [])
    data = build_route(home, stops)
    return jsonify(data)

# ─────────────────────────────────────────────────────────
# Now static
# ─────────────────────────────────────────────────────────
@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")

@app.get("/assets/<path:fn>")
def assets(fn): return send_from_directory(ROOT / "assets", fn)

@app.get("/css/<path:fn>")
def css(fn): return send_from_directory(ROOT / "css", fn)

@app.get("/js/<path:fn>")
def js(fn): return send_from_directory(ROOT / "js", fn)

@app.get("/components/<path:fn>")
def components(fn): return send_from_directory(ROOT / "components", fn)

@app.get("/city_images/<path:fn>")
def city_images(fn): return send_from_directory(ROOT / "city_images", fn)

@app.get("/data/<path:fn>")
def data_files(fn): return send_from_directory(ROOT / "data", fn)

if __name__ == "__main__":
    app.run(port=5000, debug=True)