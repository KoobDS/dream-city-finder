# CityFinder

Interactive web app which:
- **Recommends your dream city based on your preferences and needs** using reputable data and a from-scratch algorthm.
- **Maps the optimal path for your next trip** using haversine and 2-opt, handles plain-text location names.

The city recommender portion was orinally developed in Spring 2024 as a Data Science Capstone by myself, Jovan Yoshioka, and Arwen Roach, original repo: https://github.com/jovanyoshioka/CityFinder.
The trip mapping portion was originally devloped in 2023 as my first geo-focused personal project.
All data are up to date as of 2024, with source links at the bottom of this document.

## Demo:
| What you’ll see | Link |
|------|-----------------|
| **Live site** | <https://KoobDS.github.io/dream-city-finder> |
| **n-min walk-through** | [Demo video](https://youtu.be/...) |

## Tech stack:
| Layer | Main libs / services |
|-------|----------------------|
| **Front-end** | <img alt="HTML" src="https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white"> <img alt="CSS" src="https://img.shields.io/badge/-CSS3-1572B6?logo=css3&logoColor=white"> <img alt="JS" src="https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black">, **Web Components**, **Leaflet** |
| **Back-end** | <img alt="Flask" src="https://img.shields.io/badge/-Flask-000?logo=flask">  (flask-cors, python-dotenv) |
| **Data / ML** | <img alt="pandas" src="https://img.shields.io/badge/-pandas-150458?logo=pandas&logoColor=white">  <nobr><img alt="scikit-learn" src="https://img.shields.io/badge/-scikit--learn-F7931E?logo=scikit-learn&logoColor=black"></nobr> |
| **External APIs** | <img alt="Google Maps" src="https://img.shields.io/badge/-Google Maps-4285F4?logo=googlemaps&logoColor=white"> Geocoding |
| **Hosting** | <img alt="Render" src="https://img.shields.io/badge/-Render-46E3B7?logo=render&logoColor=white"> (Python API) · <img alt="GitHub Pages" src="https://img.shields.io/badge/-GitHub Pages-181717?logo=github"> (static SPA) |

## Layout:

| Path | Contents |
|------|----------|
| `/api/` | Flask app – `app.py`, production WSGI start |
| `/components/` | Reusable Web-Component panels (`tools`, `suggestions`, `trip-planner` ...) |
| `/data/` | **CityMaster1.9.csv**, **PCA_1.3.csv**, **feature_handling.csv** (processed datasets) |
| `/city_images/` | One image per state – used in suggestion cards |
| `/assets/` | Fonts, photos |
| `suggestion_algo.py` | PCA + Goldilocks + VIF recommender (pure Python) |
| `trip_mapper.py` | TSP Nearest-Neighbor + 2-Opt solver (uses Google Maps API) |
| `js/main.js` | Environment-aware API base + smooth-scroll helper |
| `requirements.txt` | Runtime Python dependencies |
| `runtime.txt` | Pins Python 3.11 for Render |
| `README.md` | This file |

## Division of work (2024 Capstone):

| Name | Key contributions |
|------|---------|-------------------|
| Benjamin Koob (me) | Data collection/engineering, Recommendation algorithm, Trip mapper algorithm (prior to capstone), Web/algorithm improvements (since capstone) |
| Jovan Yoshioka | Data collection/engineering, Web app development |
| Arwen Roach | Data collection/engineering, PCA analysis |

## Quick-start for devs

```bash
git clone https://github.com/YOUR-USERNAME/dream-city-finder.git
cd dream-city-finder
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "GMAPS_KEY=YOUR_KEY" > .env
python -m flask --app api/app.py run
```
then open http://localhost:5000

## Data source links (collected Spring 2024):

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
