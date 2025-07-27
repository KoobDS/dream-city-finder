import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os
import sklearn

from sklearn.preprocessing import MinMaxScaler
from sklearn.preprocessing import OneHotEncoder
# df = pd.read_csv('')
# Convert qual variables to dummy vars
qual_vars = ['x', 'y']  # List of qualitative variables
df = pd.get_dummies(df, columns=qual_vars, drop_first=True)
# drop one for IND/any other with potential multicollinearity

# Normalize all non-key vars
quant_vars = ['z', 'a']  # List of quantitative variables
df[quant_vars] = MinMaxScaler().fit_transform(df[quant_vars])
# PCA rel and user imp example storage:
user_importance = {'quant_var1': 3, 'quant_var2': 5, 'qual_var1_value1': 1, 'qual_var2_value2': 0}

# VIF
vif_scores = {
    'feature1': {'feature2': 1.1, 'feature3': 1.3, 'feature4': 1.2},
    'feature2': {'feature1': 1.1, 'feature3': 1.5, 'feature4': 1.4},
    'feature3': {'feature1': 1.3, 'feature2': 1.5, 'feature4': 1.6},
    'feature4': {'feature1': 1.2, 'feature2': 1.4, 'feature3': 1.6},
}

# PCA dict
pca_scores = {'feature1': 0.25, 'feature2': 0.20, 'feature3': 0.15, 'feature4': 0.10}

adjusted_relevance = adjust_feature_relevance(pca_scores, user_importance, vif_scores)
print("Adjusted Relevance Scores:", adjusted_relevance)

# Suggest the next feature to ask
next_feature = max(adjusted_relevance, key=adjusted_relevance.get)
print("Next feature to ask based on adjusted relevance:", next_feature)
# algo for recommending next feature

def adjust_feature_relevance(pca_scores, user_importance, vif_scores):
    adjusted_relevance = {}
    total_features = len(pca_scores)
    
    for feature, pca_score in pca_scores.items():
        # Calculate the average VIF weighted by user importance for this feature against others
        vif_weighted_sum = sum(
            vif_scores[feature].get(other_feature, 0) * user_importance.get(other_feature, 0)
            for other_feature in pca_scores if other_feature != feature
        ) / (total_features - 1)
        
        # Adjust the PCA score by subtracting the weighted VIF sum
        adjusted_relevance[feature] = max(pca_score * 50 - vif_weighted_sum, 0)  # Ensure relevance is not negative

    return adjusted_relevance
# Calculate city scores
city_scores = {}
for index, row in df.iterrows():
    score = sum(row[var] * PCA_relevance.get(var, 0) * user_importance.get(var, 0) for var in df.columns)
    city_scores[index] = score

# Sort cities by their scores in descending order
sorted_cities = sorted(city_scores.items(), key=lambda x: x[1], reverse=True)

# Display the top 5 cities based on scores
print("Top 5 cities based on scores:", sorted_cities[:5])
# code threshold for explainability to end sim
# code passthrough for user var category choice
# add to pro list if * > * median for normalized var of interest >=3
# add to cons list * < * median for normalized var of interest >=3
# dummy
# normalize
# invert when necessary
### Main Algorithm:

"""
built to handle 'Goldilock's variables (where there is no objectively better values low vs. high and there is a goldilock's zone for users)
uses row[var] for normalized variables (columns 'type' = norm), as with previous version
however, for 'type' = gold, calculate the difference between the user given ideal (in a dictionary)
gold_dict = {var_name, given_value, var_range} where var_range is the total range of that feature in the dataset
given_value is the user's ideal
calculate the difference between given_value and the value for each city, maybe stored in a dict, then divide by the range
use that value in place of row[var] (which is used for normalized vars) in the sum for gold vars"
"""

def calculate_score(row, PCA_relevance, user_importance, gold_dict):
    score = 0
    for var in df.columns:
        if var in gold_dict:
            # Handling 'gold' type variables
            diff = abs(gold_dict[var]['given_value'] - row[var])
            normalized_diff = diff / gold_dict[var]['var_range']
            score += (1 - normalized_diff) * PCA_relevance.get(var, 0) * user_importance.get(var, 0)
        else:
            # Handling 'norm' type variables
            score += row[var] * PCA_relevance.get(var, 0) * user_importance.get(var, 0)
    return score

city_scores = {index: calculate_score(row, PCA_relevance, user_importance, gold_dict) for index, row in df.iterrows()}

# Sort cities by their scores in descending order
sorted_cities = sorted(city_scores.items(), key=lambda x: x[1], reverse=True)

# Display the top n cities based on scores
print("Top 5 cities based on scores:", sorted_cities[:5])