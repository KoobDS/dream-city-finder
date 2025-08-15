from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import logging
import math

# Pull from your algo; df_master used for stateFIPS lookup
from suggestion_algo import suggest_top_cities, df_master  # type: ignore

# Optional: weights per feature (used for fallback reasons)
try:
    from suggestion_algo import PCA_SCORES  # type: ignore
except Exception:
    PCA_SCORES = {}

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

app = Flask(__name__, static_folder=None)
CORS(app)
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


def _fallback_top_features(prefs: dict, k: int = 5):
    """
    If the algorithm doesn't supply topFeatures, compute a reasonable
    fallback: rank features by |PCA weight| * user importance.
    """
    if not PCA_SCORES:
        return []
    pairs = []
    for f, pca_w in PCA_SCORES.items():
        try:
            imp = float(prefs.get(f, 0))  # 1..5 for norm/inv; numeric for gold
        except Exception:
            imp = 0.0
        w = abs(float(pca_w)) * imp
        if w > 0 and f:
            pairs.append((w, f))
    pairs.sort(reverse=True)
    return [f for _, f in pairs[:k]]


# ─────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────
@app.post("/api/suggest")
def api_suggest():
    """
    Returns top-N suggestions enriched with:
      - stateFIPS (for image lookup)
      - topFeatures (from the algorithm if present; otherwise PCA-weighted fallback)
      - scaledScore (0-100 using *global* min/max across all cities)
    """
    payload = request.get_json(silent=True) or {}
    prefs   = payload.get("preferences") or {}
    limit   = int(payload.get("limit") or payload.get("top") or 25)

    # 1) Get top-N (these should include raw 'score' and often 'topFeatures')
    topN = suggest_top_cities(prefs, top_n=limit)

    # 2) Get global min/max by asking the algorithm for *all* scored rows.
    #    If the function can’t handle huge 'top_n', we fall back to topN min/max.
    global_min = None
    global_max = None
    try:
        all_scored = suggest_top_cities(prefs, top_n=10_000_000)
        if all_scored and isinstance(all_scored, list):
            scores = []
            for it in all_scored:
                if isinstance(it, dict) and "score" in it:
                    try:
                        scores.append(float(it["score"]))
                    except Exception:
                        pass
            if scores:
                global_min = min(scores)
                global_max = max(scores)
    except Exception as e:
        log.info("Global min/max fallback (reason: %s)", e)

    # Fallback to min/max of topN if we couldn’t get global range
    if global_min is None or global_max is None:
        scores = []
        for it in (topN or []):
            if isinstance(it, dict) and "score" in it:
                try:
                    scores.append(float(it["score"]))
                except Exception:
                    pass
        if scores:
            global_min = min(scores)
            global_max = max(scores)

    # Safety: avoid division-by-zero later
    if global_min is None:
        global_min = 0.0
    if global_max is None:
        global_max = 1.0
    same = (abs(global_max - global_min) < 1e-12)

    # 3) Normalize + enrich
    items = []
    for item in (topN or []):
        # Normalize city/state and pull through algo-provided fields when present
        if isinstance(item, str):
            city_part, state_part = (item.split(",", 1) + [""])[:2]
            city_part  = city_part.strip()
            state_part = state_part.strip()
            raw_score  = None
            top_feats  = []
        elif isinstance(item, dict):
            city_part  = (item.get("cityName") or item.get("city_ascii")
                          or item.get("city") or "").strip()
            state_part = (item.get("stateName") or item.get("State")
                          or item.get("state") or "").strip()
            raw_score  = item.get("score", None)
            # accept either 'topFeatures' or 'top_features'
            top_feats  = item.get("topFeatures") or item.get("top_features") or []
        else:
            city_part, state_part, raw_score, top_feats = str(item), "", None, []

        # ensure we always have some reasons
        if not top_feats:
            top_feats = _fallback_top_features(prefs, k=5)

        # derive stateFIPS (2-digit) from your master row
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

        items.append({
            "cityName": city_part,
            "stateName": state_part,
            "stateFIPS": state_fips,
            "topFeatures": top_feats,       # final set of reasons
            "rawScore": raw_score,          # keep raw if you want to show it later
            "scaledScore": scaled           # 0..100 (global)
        })

    suggestions = {str(i): it for i, it in enumerate(items, start=1)}
    return jsonify({"suggestions": suggestions})


@app.post("/api/route")
def api_route():
    # Local import avoids ImportError during early development
    from trip_mapper import build_route  # type: ignore
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


if __name__ == "__main__":
    app.run(port=5000, debug=True)
