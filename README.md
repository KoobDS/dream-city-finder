# CityFinder v2

An interactive web app with a [live site]([https://youtu.be/...](https://KoobDS.github.io/dream-city-finder)) that:

- **Finds your dream city** — scores 3,000+ U.S. cities on dozens of lifestyle, economic, and climate factors using a custom algorithm built from reputable data.
- **Plans the optimal route for your next trip** — solves the Traveling Salesman Problem using haversine + 2-opt, works with plain-text location names.

The city recommender was originally developed (Spring 2024) as a Data Science Capstone by myself, Jovan Yoshioka, and Arwen Roach — [original repo](https://github.com/jovanyoshioka/CityFinder).  
The trip mapper began in 2023 as my first geo-focused personal project.  
All datasets are current to Spring 2024 - full source list below.

---

## Demo:
| What you’ll see | Link |
|------|-----------------|
| **Live site** | <https://KoobDS.github.io/dream-city-finder> |
| **n-min walk-through** | [Demo video](https://youtu.be/...) |

---

## How it works

- **City recommender**  
  1. Preprocess dozens of datasets spanning socioeconomic factors, climate, housing, amenities, and more.  
  2. Reduce correlated variables via PCA + VIF filtering.  
  3. Score each city on “Goldilocks” matching to user preferences.  
  4. Scale results to a global 0–100 and surface the top N cities with the most influential matching features.

- **Trip mapper**  
  1. Geocode each stop (Google Maps API).  
  2. Compute pairwise haversine distances.  
  3. Build an initial route via Nearest-Neighbor.  
  4. Improve with 2-opt swapping until no shorter path is found (significantly faster than tested  ML models).

---

## Tech stack:
| Layer | Main libs / services |
|-------|----------------------|
| **Front-end** | HTML5, CSS3, JavaScript, Web Components, Leaflet |
| **Back-end** | Flask (flask-cors, python-dotenv) |
| **Data / ML** | pandas, scikit-learn |
| **External API** | Google Maps Geocoding |
| **Hosting** | Render (Python API) · GitHub Pages (static SPA) |

---

## Project layout

| Path | Contents |
|------|----------|
| `/api/` | Flask API (`app.py`) + WSGI start for Render |
| `/assets/` | Fonts, icons, photos |
| `/components/` | Web-Component panels (`tools`, `suggestions`, `trip-planner`, ...) |
| `/css/` | Global and component-specific stylesheets |
| `/data/` | Production datasets: **CityMaster1.9.5.csv**, **PCA_1.3.csv**, **feature_handling.csv** |
| `/development/` | Notebooks from algorithm development and data engineering |
| `/js/` | Main JavaScript file including API base + smooth-scroll helper |
| `requirements.txt` | Python dependencies |
| `suggestion_algo.py` | PCA + Goldilocks + VIF recommender |
| `trip_mapper.py` | TSP solver (Nearest-Neighbor + 2-Opt) |
| `README.md` | This file |

---

## 2024 Capstone division of work

| Name | Key contributions |
|-------|--------|
| **Benjamin Koob** | Data engineering, recommendation algorithm, trip mapper algorithm, post-capstone web/app improvements |
| **Jovan Yoshioka** | Data engineering, initial web app build |
| **Arwen Roach** | Data engineering, PCA analysis |

---

## Quick-start (local dev)

```bash
git clone https://github.com/YOUR-USERNAME/dream-city-finder.git
cd dream-city-finder
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "GMAPS_KEY=YOUR_KEY" > .env
python -m flask --app api/app.py run
```
then open http://localhost:5000

---

## Data source links (collected Spring 2024):

<details>
<summary>Click to expand full list</summary>
- https://www2.census.gov/programs-surveys/cps/methodology/2015%20Geography%20Cover.pdf 
- https://cps.ipums.org/cps/codes/metfips_2014onward_codes.shtml#note 
- https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt
- https://usa.ipums.org/usa-action/variables/CITYPOP#codes_section
- https://www.ers.usda.gov/webdocs/DataFiles/48747/PopulationEstimates.xlsx?v=9655.3
- https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html
- https://www.bls.gov/respondents/mwr/electronic-data-interchange/appendix-d-usps-state-abbreviations-and-fips-codes.htm
- https://data.bls.gov/cew/apps/table_maker/v4/table_maker.htm#type=5&year=2023&qtr=3&own=5&area=US000&supp=0
- https://data.cms.gov/provider-data/dataset/xubh-q36u
- https://www.bts.gov/national-transit-map
- https://reports.collegeboard.org/sat-suite-program-results
- https://www.act.org/content/act/en/research/services-and-resources/data-and-visualization.html
- https://www.irs.gov/statistics/soi-tax-stats-county-data-2021    
- https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt
- https://www.huduser.gov/portal/datasets/usps.html
- https://ucr.fbi.gov/crime-in-the-u.s/2018/crime-in-the-u.s.-2018
- https://www2.ed.gov/about/inits/ed/edfacts/data-files/acgr-sch-sy2020-21-long.csv
- https://data.ed.gov/dataset/edfacts-graduates-and-dropouts-2017-18-67e58
- https://data.ed.gov/dataset?q=graduation+rate+by+FIPS
- https://nces.ed.gov/programs/digest/d21/tables/dt21_219.10.asp
- https://ucr.fbi.gov/crime-in-the-u.s/2019/crime-in-the-u.s.-2019/downloads/cius2019datatables-1.zip
</details>
