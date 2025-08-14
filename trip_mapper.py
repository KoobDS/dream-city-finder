from __future__ import annotations
import os
import math
from typing import Dict, List, Tuple
import googlemaps

# --- tiny helpers ----------------------------------------------------
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def _geocode_many(names: List[str], gmaps_client) -> Dict[str, Tuple[float, float]]:
    out: Dict[str, Tuple[float, float]] = {}
    for name in names:
        if not name:
            continue
        res = gmaps_client.geocode(name)
        if not res:
            raise ValueError(f"Could not geocode '{name}'")
        loc = res[0]["geometry"]["location"]
        out[name] = (float(loc["lat"]), float(loc["lng"]))
    return out

def _build_distance_matrix(coords: Dict[str, Tuple[float, float]]) -> Dict[Tuple[str, str], float]:
    names = list(coords.keys())
    d: Dict[Tuple[str, str], float] = {}
    for i, a in enumerate(names):
        for j, b in enumerate(names):
            if i == j:
                continue
            d[(a,b)] = _haversine(coords[a][0], coords[a][1], coords[b][0], coords[b][1])
    return d

def _nearest_neighbor(start: str, nodes: List[str], dist: Dict[Tuple[str,str], float]) -> List[str]:
    path = [start]
    unvisited = [n for n in nodes if n != start]
    while unvisited:
        cur = path[-1]
        nxt = min(unvisited, key=lambda n: dist[(cur, n)])
        path.append(nxt)
        unvisited.remove(nxt)
    return path

def _two_opt(path: List[str], dist: Dict[Tuple[str,str], float]) -> List[str]:
    improved = True
    n = len(path)
    while improved:
        improved = False
        for i in range(1, n-2):
            for j in range(i+1, n-1):
                if j - i == 1:
                    continue
                a, b = path[i-1], path[i]
                c, d = path[j], path[j+1]
                old = dist[(a,b)] + dist[(c,d)]
                new = dist[(a,c)] + dist[(b,d)]
                if new < old:
                    path[i:j+1] = reversed(path[i:j+1])
                    improved = True
                    break
            if improved:
                break
    return path

# --- public API used by Flask ---------------------------------------
def build_route(home: str, stops: List[str]) -> Dict:
    """
    Returns:
      {
        "coordinates": { "City": [lat, lon], ... },
        "order": ["Home", "Stop1", ..., "Home"]   # loop closed
      }
    """
    api_key = os.getenv("GMAPS_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GMAPS_KEY not set")

    gmaps_client = googlemaps.Client(key=api_key)

    # normalize/unique, keep order
    stops = [s for s in [s.strip() for s in (stops or [])] if s]
    names = [home] + [s for i, s in enumerate(stops) if s not in stops[:i]]

    # geocode
    coords = _geocode_many(names, gmaps_client)
    dist = _build_distance_matrix(coords)

    # route: start at home, NN then 2-opt; close loop by returning home
    nn = _nearest_neighbor(home, list(coords.keys()), dist)
    best = _two_opt(nn, dist)
    if best[-1] != home:
        best.append(home)

    # coordinates as [lat, lon] arrays for the front-end
    coords_list = {k: [coords[k][0], coords[k][1]] for k in coords.keys()}
    return {"coordinates": coords_list, "order": best}