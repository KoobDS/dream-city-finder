"""
Trip-planner core, web-ready version of algorithms/Suggestion_Algorithm.ipynb (no plotting or Cartopy).

solve_trip(home, stops)  ->  {"order": [...], "coordinates": {city: (lat, lon)} }
"""

from __future__ import annotations
import os
from typing import Dict, List, Tuple

import googlemaps
from math import radians, cos, sin, sqrt, atan2

GMAPS = googlemaps.Client(key=os.getenv("GMAPS_KEY"))

# ------------------------------------------------------------------ #
# 1. Geometry helpers                                                #
# ------------------------------------------------------------------ #
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Metres between two WGS-84 points."""
    R = 6_371_000
    d_lat, d_lon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    )
    return 2 * R * atan2(sqrt(a), sqrt(1 - a))


def _geocode(city: str) -> Tuple[float, float]:
    loc = GMAPS.geocode(city)[0]["geometry"]["location"]
    return loc["lat"], loc["lng"]


def _coords_and_distances(cities: List[str]):
    coords: Dict[str, Tuple[float, float]] = {c: _geocode(c) for c in cities}
    dist: Dict[Tuple[str, str], float] = {}
    for a in cities:
        for b in cities:
            if a != b:
                dist[(a, b)] = _haversine(*coords[a], *coords[b])
    return coords, dist


# ------------------------------------------------------------------ #
# 2. Simple TSP (nearest-neighbour + 2-opt)                           #
# ------------------------------------------------------------------ #
def _nearest_neighbor(coords, dist) -> List[str]:
    unvisited = list(coords)
    path = [unvisited.pop(0)]
    while unvisited:
        nxt = min(unvisited, key=lambda c: dist[(path[-1], c)])
        path.append(nxt)
        unvisited.remove(nxt)
    return path


def _two_opt(path: List[str], dist) -> List[str]:
    improved = True
    while improved:
        improved = False
        for i in range(1, len(path) - 2):
            for j in range(i + 1, len(path) - 1):
                if j - i == 1:
                    continue
                old = dist[(path[i - 1], path[i])] + dist[(path[j], path[j + 1])]
                new = dist[(path[i - 1], path[j])] + dist[(path[i], path[j + 1])]
                if new < old:
                    path[i : j + 1] = reversed(path[i : j + 1])
                    improved = True
                    break
            if improved:
                break
    return path


# ------------------------------------------------------------------ #
# 3. Public API                                                      #
# ------------------------------------------------------------------ #
def solve_trip(home: str, stops: List[str]) -> Dict:
    """
    Parameters
    ----------
    home   : starting/ending city
    stops  : list of intermediate cities

    Returns
    -------
    dict with "order" and "coordinates" keys (JSON-serialisable).
    """
    cities = [home] + stops
    coords, dist = _coords_and_distances(cities)
    tour = _two_opt(_nearest_neighbor(coords, dist), dist)
    return {"order": tour, "coordinates": coords}
