from __future__ import annotations

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import logging
import math

# ─────────────────────────────────────────────────────────
# Paths / App
# ─────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

app = Flask(__name__, static_folder=None)
CORS(app)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cityfinder")

# ─────────────────────────────────────────────────────────
# Algorithm imports
# ─────────────────────────────────────────────────────────
from suggestion_algo import (
    suggest_top_cities,
    df_master,            # pandas DataFrame
    PCA_SCORES,           # dict: feature -> pca weight
    gold_vars             # set/list of gold features (ideal-valued)
)
from trip_mapper import build_route

# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

FIPS_BY_STATE = {
    "Alabama":"01","Alaska":"02","Arizona":"04","Arkansas":"05","California":"06","Colorado":"08","Connecticut":"09",
    "Delaware":"10","District of Columbia":"11","Florida":"12","Georgia":"13","Hawaii":"15","Idaho":"16","Illinois":"17",
    "Indiana":"18","Iowa":"19","Kansas":"20","Kentucky":"21","Louisiana":"22","Maine":"23","Maryland":"24",
    "Massachusetts":"25","Michigan":"26","Minnesota":"27","Mississippi":"28","Missouri":"29","Montana":"30","Nebraska":"31",
    "Nevada":"32","New Hampshire":"33","New Jersey":"34","New Mexico":"35","New York":"36","North Carolina":"37",
    "North Dakota":"38","Ohio":"39","Oklahoma":"40","Oregon":"41","Pennsylvania":"42","Rhode Island":"44",
    "South Carolina":"45","South Dakota":"46","Tennessee":"47","Texas":"48","Utah":"49","Vermont":"50","Virginia":"51",
    "Washington":"53","West Virginia":"54","Wisconsin":"55","Wyoming":"56"
}

def _state_fips_for(city: str, state: str) -> str:
    try:
        mask_city  = (df_master["city_ascii"] == city) if "city_ascii" in df_master.columns else None
        mask_state = (df_master["State"] == state)      if "State"     in df_master.columns else None
        if mask_city is not None and mask_state is not None:
            row = df_master[mask_city & mask_state]
            if not row.empty:
                if "FIPS_2digit" in row.columns:
                    return str(int(row.iloc[0]["FIPS_2digit"])).zfill(2)
                if "state_fips" in row.columns:
                    return str(int(row.iloc[0]["state_fips"])).zfill(2)
    except Exception as e:
        log.debug("FIPS lookup failed for %s, %s: %s", city, state, e)
    return FIPS_BY_STATE.get(state, "00")

def _top_features_from_prefs(prefs: dict, k: int = 5) -> list[str]:
    items = []
    for var, pca_w in PCA_SCORES.items():
        if var in gold_vars:
            continue
        try:
            user_w = float(prefs.get(var, 0))
        except Exception:
            user_w = 0.0
        if user_w:
            items.append((var, abs(pca_w) * user_w))
    items.sort(key=lambda t: t[1], reverse=True)
    return [v for v, _ in items[:k]]

# ─────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────

def api_suggest():
    payload = request.get_json(silent=True) or {}
    prefs   = payload.get("preferences") or {}
    try:
        limit = int(request.args.get("limit", 25))
    except Exception:
        limit = 25

    raw = suggest_top_cities(prefs, top_n=limit)

    # Normalize to dicts (city, state, score?)
    norm = []
    for item in raw:
        if isinstance(item, dict):
            city  = item.get("cityName") or item.get("city_ascii") or item.get("city") or ""
            state = item.get("stateName") or item.get("State") or item.get("state") or ""
            score = item.get("score")
        elif isinstance(item, str):
            if "," in item:
                city, state = [s.strip() for s in item.split(",", 1)]
            else:
                city, state = item.strip(), ""
            score = None
        else:
            city, state, score = str(item), "", None
        norm.append({"cityName": city, "stateName": state, "score": score})

    # Collect the max among the list we will show
    top_scores = [r["score"] for r in norm if isinstance(r.get("score"), (int, float))]
    top_max = max(top_scores) if top_scores else None

    # Global minimum via suggestion_algo helper (fallback to local min)
    global_min = None
    try:
        from suggestion_algo import score_all_cities  # added helper
        all_scores = score_all_cities(prefs)
        if all_scores:
            global_min = min(all_scores)
    except Exception as e:
        log.info("Universal min not available, falling back: %s", e)
        global_min = min(top_scores) if top_scores else None

    # Scale 0..100 using max from top25, min from global worst
    if top_max is not None and global_min is not None and top_max != global_min:
        for r in norm:
            s = r.get("score")
            if isinstance(s, (int, float)):
                r["scaledScore"] = round(100 * (s - global_min) / (top_max - global_min))
    elif top_max is not None:
        for r in norm:
            if isinstance(r.get("score"), (int, float)):
                r["scaledScore"] = 100

    reasons = _top_features_from_prefs(prefs, k=5)

    suggestions = {}
    for i, r in enumerate(norm, start=1):
        city, state = r["cityName"], r["stateName"]
        fips2 = _state_fips_for(city, state) if state else "00"
        suggestions[str(i)] = {
            "cityName": city,
            "stateName": state,
            "stateFIPS": fips2,
            "topFeatures": reasons,
            "score": r.get("score"),
            "scaledScore": r.get("scaledScore")
        }

    return jsonify({"suggestions": suggestions})

@app.post("/api/route")
def api_route():
    payload = request.get_json(silent=True) or {}
    home  = payload.get("home", "")
    stops = payload.get("stops", [])
    return jsonify(build_route(home, stops))

# ─────────────────────────────────────────────────────────
# Static files
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

@app.get("/health")
def health(): return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
