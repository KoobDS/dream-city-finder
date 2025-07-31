"""
City-recommendation engine, web-ready version of algorithms/Suggestion_Algorithm.ipynb

`df_raw` : master CSV of city metrics
`suggest_top_cities(prefs, n)` : return best-matching city names
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Union

import pandas as pd

# ─────────────────────────────────────────────────────────────────────
# 1. Point to data CSVs
# ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent / "data"
MASTER_CSV       = BASE / "CityMaster1.9.csv"
PCA_CSV          = BASE / "PCA_1.3.csv"
FEATURE_CFG_CSV  = BASE / "feature_handling.csv"

# ─────────────────────────────────────────────────────────────────────
# 2. Load at import
# ─────────────────────────────────────────────────────────────────────
# master metrics
df_master = pd.read_csv(MASTER_CSV, index_col=False)

# PCA loadings, expected columns: Variable, Loading
df_pca       = pd.read_csv(PCA_CSV)
PCA_SCORES   = dict(zip(df_pca["Variable"], df_pca["Loading"]))

# feature-handling table:
# Columns: Variable, Handling (Normal scale, 'Goldilocks'),
#          Inversion (Y/N), User Facing Name, Note
df_cfg = pd.read_csv(FEATURE_CFG_CSV)

# ─────────────────────────────────────────────────────────────────────
# 3. Derive drop/invert/gold lists
# ─────────────────────────────────────────────────────────────────────
VAR_COL      = "Variable"
HANDLING_COL = "Handling (Normal scale, 'Goldilocks')"
INV_COL      = "Inversion (Y/N)"

# drop anything marked obsolete (case-insensitive startswith 'obs')
drop_vars = (
    df_cfg[df_cfg[HANDLING_COL]
           .str.strip()
           .str.lower()
           .str.startswith("obs")][VAR_COL]
    .tolist()
)

# invert those flagged 'Y'
invert_vars = (
    df_cfg[df_cfg[INV_COL]
           .str.strip()
           .str.upper() == "Y"][VAR_COL]
    .tolist()
)

# gold-zone variables
gold_vars = (
    df_cfg[df_cfg[HANDLING_COL]
           .str.strip()
           .str.lower() == "gold"][VAR_COL]
    .tolist()
)

# ─────────────────────────────────────────────────────────────────────
# 4. Core scoring helpers
# ─────────────────────────────────────────────────────────────────────
def _row_score(
    row: pd.Series,
    rel_weights: Dict[str, Union[float, Dict[str, float]]],
    gold_ranges: Dict[str, float],
) -> float:
    """Score one city given combined relevance weights."""
    total = 0.0
    for var, w in rel_weights.items():
        if var not in row or w == 0:
            continue
        val = row[var]
        if var in gold_ranges:
            # w is {"ideal":..., "pca":...}
            ideal, pca_w = w["ideal"], w["pca"]
            diff = abs(val - ideal)
            scale = gold_ranges[var]
            score = 1 - (diff / scale) if scale > 0 else 0
            total += score * pca_w
        else:
            # w is numeric = user_imp * pca
            total += val * w
    return total

# ─────────────────────────────────────────────────────────────────────
# 5. Public API
# ─────────────────────────────────────────────────────────────────────
def suggest_top_cities(
    prefs: Dict[str, Union[int, float]],
    top_n: int = 5
) -> List[str]:
    """
    prefs: {variable_name: 1-5 slider value, ...}
    returns: list of "City, State" strings (best first).
    """
    # a) Copy and drop obsolete
    df = df_master.drop(columns=[c for c in drop_vars if c in df_master.columns])

    # b) Invert bad-is-high vars
    for v in invert_vars:
        if v in df.columns:
            df[v] = 1 - df[v]

    # c) Precompute gold ranges
    gold_ranges = {
        v: float(df[v].max() - df[v].min())
        for v in gold_vars
        if v in df.columns
    }

    # d) Build combined relevance weights
    #    - norm vars: w = user_imp * pca
    #    - gold vars: w = {"ideal":user_imp, "pca":pca}
    rel_weights: Dict[str, Union[float, Dict[str, float]]] = {}
    for var, pca_w in PCA_SCORES.items():
        if var not in df.columns:
            continue
        user_imp = float(prefs.get(var, 0))
        if var in gold_ranges:
            rel_weights[var] = {"ideal": user_imp, "pca": pca_w}
        else:
            rel_weights[var] = user_imp * pca_w

    # e) Score each row
    scores = df.apply(lambda r: _row_score(r, rel_weights, gold_ranges), axis=1)

    # f) Grab top indices
    top_idx = scores.nlargest(top_n).index

    # g) Build user-friendly names
    results: List[str] = []
    for idx in top_idx:
        city_part  = (
            df.loc[idx, "city_ascii"]
            if "city_ascii" in df.columns else str(idx)
        )
        state_part = (
            df.loc[idx, "State"]
            if "State" in df.columns else None
        )
        results.append(
            f"{city_part}, {state_part}" if state_part else city_part
        )
    return results