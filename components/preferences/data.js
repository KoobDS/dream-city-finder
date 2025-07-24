/**
 * Questions associated with each of the feature types (below).
 * 
 */
const FEATURE_TYPE_QUESTIONS = {
  'norm': 'How important to you is it that',
  'inv_norm': 'How important to you is it that',
  'gold': 'What is your ideal'
};

/**
 * Feature Types (Norm / Inverse Norm / Goldilocks)
 * Determines how questions are asked to user (above).
 */
const FEATURE_TYPES = {
  'Acreage': 'norm', 
  'HHINCOME_mean': 'norm', 
  'HHINCOME_median': 'norm', 
  'VALUEH_mean': 'gold', 
  'VALUEH_median': 'gold', 
  'AGE_mean': 'gold', 
  'AGE_median': 'gold', 
  'Employment_Rate': 'norm', 
  'Unemployment_Rate': 'inv_norm', 
  'IND_Arts_Ent_Rec_Food': 'norm', 
  'IND_Constr': 'norm', 
  'IND_Fin_Ins_RealEstate': 'norm', 
  'IND_Info': 'norm', 
  'IND_Manu': 'norm', 
  'IND_OtherServices': 'norm', 
  'IND_PublicAdmin': 'norm', 
  'IND_Retail': 'norm', 
  'IND_Transpo_Ware_Util': 'norm', 
  'IND_Wholesale': 'norm', 
  'Adherents as % of Population': 'norm', 
  'Congregations Per 100,000 Pop. Rank': 'norm', 
  'alltransit_performance_score': 'norm', 
  'Cropland_Rate': 'norm', 
  'Pasture_Rate': 'norm', 
  'Forest_Rate': 'norm', 
  'incident_counts': 'inv_norm', 
  'Arts_Ent_Rec_Est': 'norm', 
  'Food_Est': 'norm', 
  'Annual_Precip': 'gold', 
  'Annual_Snowfall': 'gold', 
  'Winter_Temp': 'gold', 
  'Summer_Temp': 'gold', 
  'HS_GRAD_RATE': 'norm', 
  'violent_crime': 'inv_norm', 
  'Num_Hospitals': 'norm', 
  'Hospital overall rating': 'norm', 
  'new_city_pop': 'norm', 
  'city': 'key', 
  'Legal Status_Fully Legal': 'norm', 
  'Decriminalized_Yes': 'norm', 
  'time_zone_C': 'norm', 
  'time_zone_E': 'norm', 
  'time_zone_M': 'norm', 
  'time_zone_P': 'norm', 
  'Rep_W': 'norm',
  'Dem_W': 'norm', 
  'Average Tax Burden': 'norm', 
  'theft': 'inv_norm', 
  'time_zone_other': 'norm'
};

/**
 * Goldilock Feature Ranges and Units
 * Format: [min, max, units]
 */
const GOLDILOCK_FEATURE_RANGES = {
  'VALUEH_median': [175000, 9999999, 'USD', 400000],
  'AGE_mean': [31, 60, 'years', 42],
  'Annual_Precip': [0, 99, 'inches', 32],
  'Annual_Snowfall': [0, 220, 'inches', 2],
  'Winter_Temp': [4, 72, '&deg Fahrenheit', 33],
  'Summer_Temp': [56, 88, '&deg Fahrenheit', 74]
};

/**
 * User-Facing Feature Names
 *   Note: Formatted to fit in above prompts.
 */
const FEATURE_NAMES = {
  'Annual_Snowfall': 'Annual Snowfall',
  'IND_Retail': 'The Retail Industry is Strong',
  'time_zone_E': 'The Time Zone is Eastern Time',
  'IND_Info': 'The Information Industry is Strong',
  'IND_Manu': 'The Manufacturing Industry is Strong',
  'violent_crime': 'Violent Crime is Low',
  'Congregations Per 100,000 Pop. Rank': 'There are Places of Worship Nearby',
  'Num_Hospitals': 'There are a Lot of Hospitals Nearby',
  'time_zone_C': 'The Time Zone is Central Time',
  'Housing Density': 'You are in a Dense Area',
  'HHINCOME_median': 'Median Income is High in the Area',
  'IND_PublicAdmin': 'The Public Admin Industry is Strong',
  'Pasture_Rate': 'There is a Lot of Pasture Nearby',
  'Cropland_Rate': 'There is a Lot of Cropland Nearby',
  'Adherents as % of Population': 'You are in a Highly Religious Area',
  'Rep_W': 'The Area Votes Republican',
  'VALUEH_median': 'Home Value',
  'Forest_Rate': 'There is a Lot of Forest Nearby',
  'new_city_pop': 'The City Population is High',
  'IND_Transpo_Ware_Util': 'The Transportation/Warehousing/Utilities Industry is Strong',
  'alltransit_performance_score': 'The City Has High-Quality Transit',
  'theft': 'Theft is Low',
  'IND_Arts_Ent_Rec_Food': 'The Arts/Entertainment/Recreation/Food Industry is Strong',
  'Legal Status_Fully Legal': 'Marijuana is Legal',
  'Summer_Temp': 'Summer Temperature',
  'time_zone_M': 'The Time Zone is Mountain Time',
  'IND_Constr': 'The Construction Industry is Strong',
  'IND_Wholesale': 'The Wholesale Industry is Strong',
  'Arts_Ent_Rec_Est': 'There are a Lot of Entertainment and Recreation Establishments',
  'Average Tax Burden': 'Average Tax Burden is Low',
  'Dem_W': 'The Area Votes Democrat',
  'Food_Est': 'There are a Lot of Restaurants',
  'AGE_mean': 'Average Age',
  'IND_Fin_Ins_RealEstate': 'The Finance/Insurance/Real Estate Industry is Strong',
  'Hospital overall rating': 'Nearby Hospitals are High-Quality',
  'HS_GRAD_RATE': 'High School Graduation Rate is High',
  'time_zone_P': 'The Time Zone is Pacific Time',
  'IND_OtherServices': 'The "Other Services" Industry is Strong',
  'incident_counts': 'Natural Disaster Prevalence is Low',
  'Unemployment_Rate': 'Unemployment Rate is Low',
  'Annual_Precip': 'Annual Rainfall',
  'time_zone_other': 'The Time Zone is Not ET/CT/MT/PT',
  'Winter_Temp': 'Winter Temperature',
  'Decriminalized_Yes': 'Marijuana is Decriminalized'
};

/**
 * Feature Categories (corresponding to below categorizations)
 */
const FEATURE_CATEGORIES = ["Industry", "Geography & Land Use", "Amenities", "Demographic", "Climate", "Economic", "Politics", "Crime", "Healthcare"];

/**
 * Feature Categorized
 */
const FEATURES_CATEGORIZED = {
  //"Acreage": "Geography & Land Use",
  "HHINCOME_median": "Economic",
  "VALUEH_median": "Economic",
  "AGE_mean": "Demographic",
  "Unemployment_Rate": "Economic",
  "IND_Arts_Ent_Rec_Food": "Industry",
  "IND_Constr": "Industry",
  "IND_Fin_Ins_RealEstate": "Industry",
  "IND_Info": "Industry",
  "IND_Manu": "Industry",
  "IND_OtherServices": "Industry",
  "IND_PublicAdmin": "Industry",
  "IND_Retail": "Industry",
  "IND_Transpo_Ware_Util": "Industry",
  "IND_Wholesale": "Industry",
  "Adherents as % of Population": "Demographic",
  "Congregations Per 100,000 Pop. Rank": "Demographic",
  "alltransit_performance_score": "Amenities",
  "Cropland_Rate": "Geography & Land Use",
  "Pasture_Rate": "Geography & Land Use",
  "Forest_Rate": "Geography & Land Use",
  "incident_counts": "Climate",
  "Arts_Ent_Rec_Est": "Amenities",
  "Food_Est": "Amenities",
  "Annual_Precip": "Climate",
  "Annual_Snowfall": "Climate",
  "Winter_Temp": "Climate",
  "Summer_Temp": "Climate",
  "HS_GRAD_RATE": "Demographic",
  "violent_crime": "Crime",
  "Num_Hospitals": "Healthcare",
  "Hospital overall rating": "Healthcare",
  "new_city_pop": "Demographic",
  "Legal Status_Fully Legal": "Amenities",
  "Decriminalized_Yes": "Amenities",
  "time_zone_C": "Geography & Land Use",
  "time_zone_E": "Geography & Land Use",
  "time_zone_M": "Geography & Land Use",
  "time_zone_P": "Geography & Land Use",
  "Rep_W": "Politics",
  "Dem_W": "Politics",
  "Average Tax Burden": "Politics",
  "theft": "Crime",
  "time_zone_other": "Geography & Land Use"
}

const FEATURE_SUGGESTION_NAMES = {
  'Annual_Snowfall': 'Annual Snowfall',
  'IND_Retail': 'Retail Industry',
  'time_zone_E': 'Time Zone being Eastern Time',
  'IND_Info': 'Information Industry',
  'IND_Manu': 'Manufacturing Industry',
  'violent_crime': 'Violent Crime Rate',
  'Congregations Per 100,000 Pop. Rank': 'Places of Worship Nearby',
  'Num_Hospitals': 'Hospitals Nearby',
  'time_zone_C': 'Time Zone being Central Time',
  'Housing Density': 'Density',
  'HHINCOME_median': 'Median Income',
  'IND_PublicAdmin': 'Public Admin Industry',
  'Pasture_Rate': 'Pasture Nearby',
  'Cropland_Rate': 'Cropland Nearby',
  'Adherents as % of Population': 'Highly Religious Area',
  'Rep_W': 'Republican Voting Record',
  'VALUEH_median': 'Home Values',
  'Forest_Rate': 'Forest Nearby',
  'new_city_pop': 'Population',
  'IND_Transpo_Ware_Util': 'Transportation/Warehousing/Utilities Industry',
  'alltransit_performance_score': 'High-Quality Transit',
  'theft': 'Theft Rate',
  'IND_Arts_Ent_Rec_Food': 'Arts/Entertainment/Recreation/Food Industry',
  'Legal Status_Fully Legal': 'Marijuana Legality Status',
  'Summer_Temp': 'Summer Temperature',
  'time_zone_M': 'Time Zone being Mountain Time',
  'IND_Constr': 'Construction Industry',
  'IND_Wholesale': 'Wholesale Industry',
  'Arts_Ent_Rec_Est': 'Entertainment and Recreation Establishments',
  'Average Tax Burden': 'Average Tax Burden',
  'Dem_W': 'Democrat Voting Record',
  'Food_Est': 'Restaurants',
  'AGE_mean': 'Average Age',
  'IND_Fin_Ins_RealEstate': 'Finance/Insurance/Real Estate Industry',
  'Hospital overall rating': 'High-Quality Hospitals',
  'HS_GRAD_RATE': 'High School Graduation Rate',
  'time_zone_P': 'Time Zone being Pacific Time',
  'IND_OtherServices': '"Other Services" Industry',
  'incident_counts': 'Natural Disaster Prevalence',
  'Unemployment_Rate': 'Unemployment Rate',
  'Annual_Precip': 'Annual Rainfall',
  'time_zone_other': 'Time Zone not being ET/CT/MT/PT',
  'Winter_Temp': 'Winter Temperature',
  'Decriminalized_Yes': 'Marijuana Decriminalization Status'
};