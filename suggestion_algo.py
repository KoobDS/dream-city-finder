"""
City-recommendation engine, web-ready version of algo found in development

`df_raw` : master CSV of city metrics
`suggest_top_cities(prefs, n)` : return best-matching city names
"""


from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Union, Iterable

import numpy as np
import pandas as pd

# ─────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent / "data"
MASTER_CSV       = BASE / "CityMaster1.9.csv"
PCA_CSV          = BASE / "PCA_1.3.csv"          # pivoted two-column version
FEATURE_CFG_CSV  = BASE / "feature_handling.csv"

# ─────────────────────────────────────────────────────────────────────
# Load master
# ─────────────────────────────────────────────────────────────────────
df_master = pd.read_csv(MASTER_CSV, low_memory=False)
df = df_master.copy()

# ─────────────────────────────────────────────────────────────────────
# PCA weights (tolerant to header variants)
# ─────────────────────────────────────────────────────────────────────
_df_pca = pd.read_csv(PCA_CSV)

def _pick_header(cands: Iterable[str], cols: Iterable[str]) -> str:
    norm = {str(c).strip().lower(): c for c in cols}
    for want in cands:
        if want in norm:
            return norm[want]
    raise KeyError(f"Could not find any of {cands} in PCA columns {list(cols)}")

col_feat = _pick_header({"feature", "variable"}, _df_pca.columns)
col_pc1  = _pick_header({"pc-1", "pc1", "loading"}, _df_pca.columns)

PCA_SCORES: Dict[str, float] = (
    _df_pca.assign(**{col_feat: _df_pca[col_feat].astype(str).str.strip()})
           .set_index(col_feat)[col_pc1]
           .apply(pd.to_numeric, errors="coerce")
           .dropna()
           .to_dict()
)

# ─────────────────────────────────────────────────────────────────────
# Feature handling config (drop / invert / gold)
# ─────────────────────────────────────────────────────────────────────
df_cfg = pd.read_csv(FEATURE_CFG_CSV).fillna("")
VAR_COL      = "Variable"
HANDLING_COL = "Handling (Normal scale, 'Goldilocks')"
INV_COL      = "Inversion (Y/N)"

def _norm_series(s: pd.Series) -> pd.Series:
    return s.astype(str).str.strip().str.lower()

drop_vars: List[str] = []
invert_vars: List[str] = []
gold_vars: List[str] = []

if all(c in df_cfg.columns for c in [VAR_COL, HANDLING_COL, INV_COL]):
    drop_vars = df_cfg[_norm_series(df_cfg[HANDLING_COL]).str.startswith("obs")][VAR_COL].astype(str).tolist()
    invert_vars = df_cfg[_norm_series(df_cfg[INV_COL]).eq("y")][VAR_COL].astype(str).tolist()
    gold_vars = df_cfg[_norm_series(df_cfg[HANDLING_COL]).eq("gold")][VAR_COL].astype(str).tolist()

# ─────────────────────────────────────────────────────────────────────
# Column resolution / synthesis
# ─────────────────────────────────────────────────────────────────────
ALIASES: Dict[str, Iterable[str]] = {
    "time_zone_C": ["time_zone_CM", "time_zone_CE"],  # synthesize Central from CM/CE when needed
}

def _resolve_col(name: str, frame: pd.DataFrame) -> str | None:
    """Return a column present in frame for 'name', using ALIASES if needed.
       If two alias parts exist, synthesize 'name' as their mean."""
    if name in frame.columns:
        return name
    if name in ALIASES:
        opts = [c for c in ALIASES[name] if c in frame.columns]
        if len(opts) == 1:
            frame[name] = frame[opts[0]]
            return name
        if len(opts) >= 2:
            frame[name] = frame[opts].mean(axis=1, skipna=True)
            return name
    return None

# Ensure synthesized columns up-front
_ = _resolve_col("time_zone_C", df)

# time_zone_other = not ET/CT/MT/PT
if "time_zone_other" not in df.columns:
    core = ["time_zone_E", "time_zone_C", "time_zone_M", "time_zone_P"]
    if set(core).issubset(df.columns):
        df["time_zone_other"] = (1.0 - df[core].sum(axis=1)).clip(lower=0.0)

# ─────────────────────────────────────────────────────────────────────
# Normalization (min–max) and inversion
# ─────────────────────────────────────────────────────────────────────
def _minmax(s: pd.Series) -> pd.Series:
    s = pd.to_numeric(s, errors="coerce")
    mn, mx = s.min(skipna=True), s.max(skipna=True)
    if pd.isna(mn) or pd.isna(mx) or mx == mn:
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - mn) / (mx - mn)

df_norm = df.copy()
for c in df_norm.columns:
    if pd.api.types.is_numeric_dtype(df_norm[c]):
        df_norm[c] = _minmax(df_norm[c])

# Invert “bad is high” features after normalization
for v in invert_vars:
    if v in df_norm.columns:
        df_norm[v] = 1.0 - df_norm[v]

# Gold ranges from raw (non-normalized) values
gold_ranges: Dict[str, float] = {}
for v in gold_vars:
    if v in df.columns:
        series = pd.to_numeric(df[v], errors="coerce")
        rng = series.max(skipna=True) - series.min(skipna=True)
        gold_ranges[v] = float(rng) if pd.notna(rng) and rng > 0 else 0.0

# ─────────────────────────────────────────────────────────────────────
# Scoring
# ─────────────────────────────────────────────────────────────────────
def _row_score(idx: int, prefs: Dict[str, Union[int, float, str]]) -> float:
    total = 0.0

    for var, pca_w in PCA_SCORES.items():
        # Wire up columns (synthesizing when possible)
        col_norm = _resolve_col(var, df_norm)
        if col_norm is None:
            continue  # skip unknown features

        raw_pref = prefs.get(var, 0)
        try:
            user_val = float(raw_pref)
        except Exception:
            user_val = 0.0

        # Scale user importance 0..1 (sliders 0..5)
        imp = max(0.0, min(user_val, 5.0)) / 5.0

        if var in gold_ranges and var in df.columns and gold_ranges[var] > 0:
            # Gold: user_val is IDEAL in real units
            ideal = user_val
            val = pd.to_numeric(df.loc[idx, var], errors="coerce")
            if pd.isna(val):
                continue
            closeness = max(0.0, 1.0 - (abs(val - ideal) / gold_ranges[var]))
            total += closeness * pca_w * imp
        else:
            # Normal / inv-normal: use normalized feature (already inverted if needed)
            val = float(df_norm.loc[idx, col_norm])
            total += val * pca_w * imp

    return float(total)

# ─────────────────────────────────────────────────────────────────────
# City/state extraction (robust)
# ─────────────────────────────────────────────────────────────────────
CITY_CANDS  = ["city", "City", "city_ascii", "Place", "name", "NAME"]
STATE_CANDS = ["state", "State", "state_name", "ST", "st", "usps", "STATE"]

def _pick_col(cands: Iterable[str], frame: pd.DataFrame) -> str | None:
    for c in cands:
        if c in frame.columns:
            return c
    return None

CITY_COL  = _pick_col(CITY_CANDS, df)
STATE_COL = _pick_col(STATE_CANDS, df)

# ─────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────
def suggest_top_cities(
    prefs: Dict[str, Union[int, float, str]],
    top_n: int = 10
) -> List[Dict[str, Union[str, float]]]:
    # Drop obsolete features (if any)
    to_drop = [c for c in drop_vars if c in df.columns]
    frame = df.drop(columns=to_drop) if to_drop else df

    # Score all rows
    indices = frame.index.to_list()
    scores  = np.array([_row_score(i, prefs) for i in indices])
    if scores.size == 0:
        return []

    top_idx = np.argsort(-scores)[:max(1, int(top_n))]
    out: List[Dict[str, Union[str, float]]] = []
    for pos in top_idx:
        i = indices[pos]
        city  = str(frame.loc[i, CITY_COL]) if CITY_COL else str(i)
        state = str(frame.loc[i, STATE_COL]) if STATE_COL else ""
        out.append({"cityName": city, "stateName": state, "score": float(scores[pos])})
    return out

def score_all_cities(prefs: Dict[str, Union[int, float]]) -> List[float]:
    """
    Returns raw scores for every row in df_master using the same weighting rules
    as suggest_top_cities(). Order matches df_master.index.
    """
    # build gold_ranges exactly like suggest_top_cities
    df = df_master.drop(columns=[c for c in drop_vars if c in df_master.columns]).copy()
    for v in invert_vars:
        if v in df.columns:
            df[v] = 1 - df[v]
    gold_ranges = {
        v: float(df[v].max() - df[v].min())
        for v in gold_vars if v in df.columns
    }

    # relevance weights
    rel_weights: Dict[str, Union[float, Dict[str, float]]] = {}
    for var, pca_w in PCA_SCORES.items():
        if var not in df.columns:
            continue
        user_imp = float(prefs.get(var, 0))
        if var in gold_ranges:
            rel_weights[var] = {"ideal": user_imp, "pca": pca_w}
        else:
            rel_weights[var] = user_imp * pca_w

    # row scores
    scores = df.apply(lambda r: _row_score(r, rel_weights, gold_ranges), axis=1)
    return scores.tolist()
