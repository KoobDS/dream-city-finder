from flask import Flask
from flask import request
from flask_cors import CORS
import json

import math
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) # Temporarily open to all domains.
# TODO: Replace origin below with GitHub URL.
# CORS(app, resources={r"/api/*": {"origins": "https://yourdomain.com"}})


def calculate_score(df, row, PCA_relevance, user_importance, gold_dict):
    score = 0
    contributions = {}
    for var in df.columns:
        if var not in user_importance or math.isnan(row[var]):
            continue

        if var in gold_dict:
            # Handling 'gold' type variables
            diff = abs(gold_dict[var]['given_value'] - row[var])
            normalized_diff = diff / gold_dict[var]['var_range']
            contribution = (1 - normalized_diff) * PCA_relevance.get(var, 0) * user_importance.get(var, 0)
        else:
            # Handling 'norm' type variables
            contribution = row[var] * PCA_relevance.get(var, 0) * user_importance.get(var, 0)

        score += contribution
        contributions[var] = contribution

    return score, contributions


def suggest_cities(user_importance):
    NUM_OF_RESPONSES = 25
    NUM_OF_TOP_FEAT = 5

    # Read in city data.
    df = pd.read_csv('/home/jyoshiok/mysite/CityMaster1.7.csv')

    # PCA dict
    df_pca = pd.read_csv('/home/jyoshiok/mysite/PCA_Results1.2.csv')
    pca_scores = df_pca.to_dict('list')
    for key, val in pca_scores.items():
        pca_scores[key] = val[0]

    # User preferences.
    for key, val in user_importance.items():
        user_importance[key] = int(val)

    gold_dict = {
        'VALUEH_median': {
            'given_value': user_importance['VALUEH_median'],
            'var_range': 9999999 - 175000
        },
        'AGE_mean': {
            'given_value': user_importance['AGE_mean'],
            'var_range': 60 - 31
        },
        'Annual_Precip': {
            'given_value': user_importance['Annual_Precip'],
            'var_range': 99 - 0
        },
        'Annual_Snowfall': {
            'given_value': user_importance['Annual_Snowfall'],
            'var_range': 220 - 0
        },
        'Winter_Temp': {
            'given_value': user_importance['Winter_Temp'],
            'var_range': 72 - 4
        },
        'Summer_Temp': {
            'given_value': user_importance['Summer_Temp'],
            'var_range': 88 - 56
        }
    }

    city_scores = {index: calculate_score(df, row, pca_scores, user_importance, gold_dict) for index, row in df.iterrows()}

    # Sort cities by their scores in descending order
    sorted_cities = sorted(city_scores.items(), key=lambda x: x[1][0], reverse=True)[:NUM_OF_RESPONSES]
    city_details = {}
    for i, (idx, (score, contributions)) in enumerate(sorted_cities):
        # Sort contributions by value
        sorted_contributions = sorted(contributions.items(), key=lambda x: x[1], reverse=True)
        top_features = sorted_contributions[:NUM_OF_TOP_FEAT]

        city_details[i+1] = {
            "cityName": df.loc[idx, 'city_ascii'] if not pd.isna(df.loc[idx, 'city_ascii']) else 'NaN',
            "stateName": df.loc[idx, 'State'] if not pd.isna(df.loc[idx, 'State']) else 'NaN',
            "topFeatures": [item[0] for item in top_features],
            "rank": i+1,
            "stateFIPS": str(df.loc[idx, 'FIPS_2digit']) if not pd.isna(df.loc[idx, 'FIPS_2digit']) else 'NaN'
        }

    return city_details


@app.route('/', methods=['POST'])
def handle_request():
    post_data = request.json

    cities = suggest_cities(post_data)

    result = {'suggestions': cities}
    json_dump = json.dumps(result)
    return json_dump
