import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# local-only .env
load_dotenv()

# re-use notebooks-to-scripts
from suggestion_algo import suggest_top_cities           # wrap in a func
from trip_mapper import solve_trip                       # wrap in a func

app = Flask(__name__, static_folder="../")   # serve index.html too
CORS(app)

@app.post("/api/suggest")
def suggest():
    data = request.json        # {preferences: {...}}
    top5 = suggest_top_cities(data["preferences"])
    return jsonify({"top": top5})

@app.post("/api/route")
def route():
    data = request.json        # {"home": "...", "stops": ["...", ...]}
    trip = solve_trip(data["home"], data["stops"])
    return jsonify(trip)

# OPTIONAL: serve the single-page app so `flask run` works out-of-the-box
@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path):
    if (p := os.path.join(app.static_folder, "index.html")):
        return send_from_directory(os.path.dirname(p), os.path.basename(p))
    return "Not found", 404
