from __future__ import annotations

import os
import math
import time
import logging
from typing import Dict, List, Tuple

import googlemaps
from googlemaps import exceptions as gmaps_exc

log = logging.getLogger("trip_mapper")


# ------------------------- distance helpers -------------------------
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters."""
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _build_distance_matrix(coords: Dict[str, Tuple[float, float]]
                           ) -> Dict[Tuple[str, str], float]:
    names = list(coords.keys())
    d: Dict[Tuple[str, str], float] = {}
    for i, a in enumerate(names):
        for j, b in enumerate(names):
            if i == j:
                continue
            d[(a, b)] = _haversine(coords[a][0], coords[a][1],
                                   coords[b][0], coords[b][1])
    return d


# ------------------------- tour construction ------------------------
def _nearest_neighbor(start: str, nodes: List[str],
                      dist: Dict[Tuple[str, str], float]) -> List[str]:
    """Greedy seed path (open tour)."""
    path = [start]
    unvisited = [n for n in nodes if n != start]
    while unvisited:
        cur = path[-1]
        nxt = min(unvisited, key=lambda n: dist[(cur, n)])
        path.append(nxt)
        unvisited.remove(nxt)
    return path


def _two_opt(path: List[str],
             dist: Dict[Tuple[str, str], float]) -> List[str]:
    """Classic 2-opt on an *open* path (no final home)."""
    improved = True
    n = len(path)
    while improved:
        improved = False
        for i in range(1, n - 2):
            for j in range(i + 1, n - 1):
                if j - i == 1:
                    continue
                a, b = path[i - 1], path[i]
                c, d = path[j], path[j + 1]
                old = dist[(a, b)] + dist[(c, d)]
                new = dist[(a, c)] + dist[(b, d)]
                if new < old:
                    path[i:j + 1] = reversed(path[i:j + 1])
                    improved = True
                    break
            if improved:
                break
    return path


# ---------------------------- geocoding ------------------------------
def _gmaps_client() -> googlemaps.Client:
    api_key = os.getenv("GMAPS_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GMAPS_KEY not set")

    # Configure timeouts on the client (correct place for googlemaps lib)
    connect_timeout = float(os.getenv("GMAPS_CONNECT_TIMEOUT", "5"))
    read_timeout    = float(os.getenv("GMAPS_READ_TIMEOUT", "5"))
    retry_timeout   = float(os.getenv("GMAPS_RETRY_TIMEOUT", "60"))

    return googlemaps.Client(
        key=api_key,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        retry_timeout=retry_timeout,
    )


def _dedupe_preserve_order(items: List[str]) -> List[str]:
    """Case/space-insensitive de-dupe while preserving first occurrence."""
    seen = set()
    out: List[str] = []
    for s in items:
        key = " ".join(s.split()).lower()
        if key and key not in seen:
            seen.add(key)
            out.append(s)
    return out


def _geocode_one(q: str, gmaps: googlemaps.Client) -> Tuple[float, float]:
    """
    Geocode a single query with small, targeted retries for quota/rate hiccups.
    NOTE: timeouts are set on the client; there is NO per-call timeout kwarg.
    """
    delays = [0.0, 0.5, 1.0, 2.0]  # bounded backoff
    last_err = None
    for delay in delays:
        if delay:
            time.sleep(delay)
        try:
            results = gmaps.geocode(q)  # <-- no timeout kwarg here
            if not results:
                raise RuntimeError(f"No geocoding results for '{q}'")
            loc = results[0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"])
        except gmaps_exc.Timeout as e:
            last_err = f"Geocode timeout for '{q}'"
            log.warning(last_err)
        except gmaps_exc.TransportError as e:
            last_err = f"Network error for '{q}': {e}"
            log.warning(last_err)
        except gmaps_exc.ApiError as e:
            status = (e.args[0] if e.args else "API_ERROR")
            msg = (e.args[1] if len(e.args) > 1 else "")
            last_err = f"Geocode API error for '{q}': {status} {msg}"
            log.warning(last_err)
            if str(status) not in {"OVER_QUERY_LIMIT", "RESOURCE_EXHAUSTED"}:
                break
        except Exception as e:
            last_err = f"Unexpected geocode error for '{q}': {e}"
            log.warning(last_err)
            break
    raise RuntimeError(last_err or f"Failed to geocode '{q}'")


def _geocode_many(names: List[str], gmaps: googlemaps.Client
                  ) -> Dict[str, Tuple[float, float]]:
    out: Dict[str, Tuple[float, float]] = {}
    cache: Dict[str, Tuple[float, float]] = {}
    for name in names:
        if not name:
            continue
        key = " ".join(name.split()).lower()
        if key in cache:
            out[name] = cache[key]
            continue
        latlng = _geocode_one(name, gmaps)
        cache[key] = latlng
        out[name] = latlng
    return out


# ----------------------------- public API ----------------------------
def build_route(home: str, stops: List[str]) -> Dict:
    """
    Compute a looped route:
      {
        "coordinates": { "City": [lat, lon], ... },
        "order": ["Home", "Stop1", ..., "Home"]
      }

    - Uses Google Geocoding only (no local fallback).
    - NN seed + 2-opt refinement.
    """
    home = " ".join((home or "").split())
    if not home:
        raise ValueError("Home city is required")

    stops = [s for s in [(" ".join((s or "").split())) for s in (stops or [])] if s]
    stops = _dedupe_preserve_order(stops)

    # Compose list with home exactly once at start
    names: List[str] = [home] + [s for s in stops if s.lower() != home.lower()]
    gmaps = _gmaps_client()

    if len(names) < 2:
        coords_single = _geocode_many([home], gmaps)
        lat, lon = coords_single[home]
        return {"coordinates": {home: [lat, lon]}, "order": [home, home]}

    # Geocode all
    coords = _geocode_many(names, gmaps)

    # Distances
    dist = _build_distance_matrix(coords)

    # Build tour (open), then close by returning home
    nn_path = _nearest_neighbor(home, list(coords.keys()), dist)
    best = _two_opt(nn_path, dist)
    if best[-1] != home:
        best.append(home)

    coords_out = {k: [coords[k][0], coords[k][1]] for k in coords.keys()}
    return {"coordinates": coords_out, "order": best}