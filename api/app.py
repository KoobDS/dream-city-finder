from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import logging
import math

# Pull from algo
from suggestion_algo import (
    suggest_top_cities,
    df_master,                 # master dataframe
    PCA_SCORES                 # dict: feature -> weight (we use abs() as relevance)
)

# Try to import feature handling details for better “reason” scoring
try:
    from suggestion_algo import invert_vars, gold_vars
except Exception:
    invert_vars, gold_vars = [], []

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/api/*": {"origins": "*"}})
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cityfinder")


# ─────────────────────────────────────────────────────────
# helpers
# ─────────────────────────────────────────────────────────
def _row_to_dict(row):
    if row is None:
        return {}
    d = {}
    for k in row.index:
        v = row[k]
        if v is None:
            d[k] = ""
        else:
            try:
                if isinstance(v, float) and math.isnan(v):
                    d[k] = ""
                else:
                    d[k] = v
            except Exception:
                d[k] = v
    return d


def _find_master_row(city, state):
    """Loose match on common columns: city + state."""
    if df_master is None or getattr(df_master, "empty", True):
        return None

    city = (city or "").strip().lower()
    state = (state or "").strip().lower()

    city_cols  = [c for c in ["city_ascii", "city", "City"] if c in df_master.columns]
    state_cols = [c for c in ["State", "state", "STATE"] if c in df_master.columns]
    if not city_cols or not state_cols:
        return None

    df = df_master
    mask_city = False
    for c in city_cols:
        mask_city = mask_city | (df[c].astype(str).str.strip().str.lower() == city)

    mask_state = False
    for s in state_cols:
        mask_state = mask_state | (df[s].astype(str).str.strip().str.lower() == state)

    hits = df[mask_city & mask_state]
    if hits.empty:
        return None
    return hits.iloc[0]


def _derive_state_fips(row_dict):
    """
    Dataset holds 4-5 digit *county* FIPS (e.g., 1001, 37095).
    Images need 2-digit **state** FIPS. Take first 2 digits, left-pad.
    """
    candidates = [
        "FIPS", "fips", "FIPS5", "County_FIPS", "county_fips",
        "FIPS_5digit", "FIPS_Code"
    ]
    raw = ""
    for k in candidates:
        if k in row_dict and str(row_dict[k]).strip():
            raw = str(row_dict[k]).strip()
            break
    if not raw:
        return ""
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) < 2:
        return ""
    return digits[:2].zfill(2)


def _clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))


# Precompute global stats for features we can reason about
import pandas as pd
_num_cols = []
_means = {}
_stds  = {}
_ranges = {}

if df_master is not None and not df_master.empty:
    for f in PCA_SCORES.keys():
        if f in df_master.columns:
            try:
                s = pd.to_numeric(df_master[f], errors="coerce")
                if s.notna().sum() > 3:
                    _num_cols.append(f)
                    _means[f]  = float(s.mean())
                    _stds[f]   = float(s.std(ddof=0)) or 0.0
                    _ranges[f] = float(s.max() - s.min()) or 0.0
            except Exception:
                pass


def _city_top_features(city: str, state: str, prefs: dict, k: int = 5):
    """
    Compute city-specific reasons:
      - For 'gold' features: score by closeness to the user's ideal (1 - |v-ideal|/range)
      - For others: score by |z-score| (how extreme the city is) with inversion respected
      Then weight by |PCA| * user importance.
    Returns a list of feature keys (NOT friendly names).
    """
    row = _find_master_row(city, state)
    if row is None:
        return []

    scores = []
    for f in _num_cols:
        try:
            v = float(row.get(f))
        except Exception:
            continue

        pca_w = abs(float(PCA_SCORES.get(f, 0.0)))
        if pca_w <= 0:
            continue

        # user importance: radio sliders 1..5, gold sliders are numeric "ideal"
        raw_imp = prefs.get(f, 0)
        try:
            imp = float(raw_imp)
        except Exception:
            imp = 0.0

        # Skip if the user said "not important" (or missing)
        if imp <= 0:
            continue

        if f in gold_vars:
            # Ideal value from prefs for gold features
            ideal = imp  # for gold, we stored the slider numeric as the value itself
            rng   = _ranges.get(f, 0.0)
            if rng <= 0:
                continue
            # closeness 0..1
            closeness = 1.0 - (abs(v - ideal) / rng)
            closeness = max(0.0, min(1.0, closeness))
            feat_score = pca_w * closeness
        else:
            # Standard z-score magnitude (how distinctive is this city)
            mu  = _means.get(f, 0.0)
            sd  = _stds.get(f, 0.0) or 0.0
            if sd <= 0:
                continue
            z = (v - mu) / sd
            # if "bad-is-high" invert feature, flip sign so high value becomes bad
            if f in invert_vars:
                z = -z
            feat_score = pca_w * abs(z)

        # Finally weight by user *importance* for non-gold (1..5).
        # For gold, we already used the ideal numeric; scale by 1 (treat closeness itself as the "importance").
        if f not in gold_vars:
            feat_score *= imp

        if feat_score > 0:
            scores.append((feat_score, f))

    scores.sort(reverse=True)
    return [f for _, f in scores[:k]]


# ─────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────
@app.post("/api/suggest")
def api_suggest():
    """
    Returns top-N suggestions enriched with:
      - stateFIPS (for image lookup)
      - topFeatures (city-specific reasons using PCA + user prefs + city stats)
      - scaledScore (0-100 using *global* min/max across all cities)
    """
    payload = request.get_json(silent=True) or {}
    prefs   = payload.get("preferences") or {}
    limit   = int(payload.get("limit") or payload.get("top") or 25)

    # 1) Get top-N (these may include raw 'score')
    topN = suggest_top_cities(prefs, top_n=limit)

    # 2) Global min/max (try to score all; fallback to topN range)
    global_min = None
    global_max = None
    try:
        all_scored = suggest_top_cities(prefs, top_n=10_000_000)
        if all_scored and isinstance(all_scored, list):
            vals = []
            for it in all_scored:
                if isinstance(it, dict) and "score" in it:
                    try: vals.append(float(it["score"]))
                    except Exception: pass
            if vals:
                global_min, global_max = min(vals), max(vals)
    except Exception as e:
        log.info("Global min/max fallback (reason: %s)", e)

    if global_min is None or global_max is None:
        vals = []
        for it in (topN or []):
            if isinstance(it, dict) and "score" in it:
                try: vals.append(float(it["score"]))
                except Exception: pass
        if vals:
            global_min, global_max = min(vals), max(vals)

    if global_min is None: global_min = 0.0
    if global_max is None: global_max = 1.0
    same = (abs(global_max - global_min) < 1e-12)

    # 3) Normalize + enrich
    items = []
    for item in (topN or []):
        # Normalize city/state and pull through algo-provided score (if present)
        if isinstance(item, str):
            city_part, state_part = (item.split(",", 1) + [""])[:2]
            city_part  = city_part.strip()
            state_part = state_part.strip()
            raw_score  = None
        elif isinstance(item, dict):
            city_part  = (item.get("cityName") or item.get("city_ascii")
                          or item.get("city") or "").strip()
            state_part = (item.get("stateName") or item.get("State")
                          or item.get("state") or "").strip()
            raw_score  = item.get("score", None)
        else:
            city_part, state_part, raw_score = str(item), "", None

        # state FIPS for image path
        row = _find_master_row(city_part, state_part)
        state_fips = _derive_state_fips(_row_to_dict(row))

        # universal 0–100 scaling
        if raw_score is not None and not same:
            try:
                scaled = 100.0 * (float(raw_score) - float(global_min)) / (float(global_max) - float(global_min))
                scaled = int(round(_clamp(scaled)))
            except Exception:
                scaled = None
        else:
            scaled = 100 if raw_score is not None else None

        # city-specific reasons
        reasons = _city_top_features(city_part, state_part, prefs, k=5)

        items.append({
            "cityName": city_part,
            "stateName": state_part,
            "stateFIPS": state_fips,
            "topFeatures": reasons,  # <- per-city, per-prefs
            "rawScore": raw_score,
            "scaledScore": scaled
        })

    suggestions = {str(i): it for i, it in enumerate(items, start=1)}
    return jsonify({"suggestions": suggestions})


@app.post("/api/route")
def api_route():
    from trip_mapper import build_route  # local import during dev
    payload = request.get_json(silent=True) or {}
    home  = payload.get("home", "")
    stops = payload.get("stops", [])
    return jsonify(build_route(home, stops))


# ─────────────────────────────────────────────────────────
# static
# ─────────────────────────────────────────────────────────
@app.get("/")
def index(): return send_from_directory(ROOT, "index.html")

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

@app.get("/favicon.ico")
def favicon():
    assets_dir = ROOT / "assets"
    ico = assets_dir / "favicon.ico"
    if ico.exists():
        return send_from_directory(assets_dir, "favicon.ico")
    return ("", 204)

@app.get("/api/health")
def api_health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(port=5000, debug=True)
