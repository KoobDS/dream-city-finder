import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from suggestion_algo import suggest_top_cities
from trip_mapper     import solve_trip

load_dotenv()                                # reads local .env

# (A)  serve SPA from repo-root, not “…/”
ROOT  = Path(__file__).resolve().parents[1]
FRONT = ROOT / "CityFinder"
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")  # serve /components, /assets, etc. at root


# (B)  lock CORS to front-end URLs
ALLOWED = [
    "https://<username>.github.io",
    "https://KoobDS.github.io/dream-city-finder",
    "http://localhost:5000", "http://127.0.0.1:5000"
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED}})

# ------------------------- API routes ----------------------------- #
@app.post("/api/suggest")
def suggest():
    prefs = request.json["preferences"]           # {feature: slider}
    return jsonify(top=suggest_top_cities(prefs))

@app.post("/api/route")
def route():
    data = request.json                           # {home, stops}
    return jsonify(solve_trip(data["home"], data["stops"]))

# ------------------  SPA fallback (index.html) -------------------- #
@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path):
    return send_from_directory(app.static_folder, "index.html")
