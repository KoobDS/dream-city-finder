import googlemaps
import matplotlib.pyplot as plt
import numpy as np
import os

import cartopy.crs as ccrs
import cartopy.feature as cfeature
from geographiclib.geodesic import Geodesic

from itertools import permutations
from sys import maxsize
from math import radians, cos, sin, sqrt, atan2
import heapq


gmaps = googlemaps.Client(key=os.getenv("GMAPS_KEY"))

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = (sin(d_lat / 2) ** 2 +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(d_lon / 2) ** 2)
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    return distance

def get_coordinates_and_distances(cities):
    """
    Uses Google Maps API to geocode city names, and then
    calculates all pairwise distances (in meters) via Haversine.
    """
    coordinates = {}
    distances = {}
    
    # Get Coordinates using Geocoding API
    for city in cities:
        geocode_result = gmaps.geocode(city)
        lat = geocode_result[0]['geometry']['location']['lat']
        lng = geocode_result[0]['geometry']['location']['lng']
        coordinates[city] = (lat, lng)
        
    # Calculate Distances using Haversine Formula
    for origin in cities:
        for destination in cities:
            if origin != destination and ((origin, destination) not in distances):
                distance = haversine(coordinates[origin][0],
                                     coordinates[origin][1],
                                     coordinates[destination][0],
                                     coordinates[destination][1])
                distances[(origin, destination)] = distance
                distances[(destination, origin)] = distance
                
    return coordinates, distances

def tsp_nearest_neighbor(coordinates, distances):
    """
    Simple nearest-neighbor approach to TSP.
    """
    unvisited = list(coordinates.keys())
    start_city = unvisited.pop(0)  # Start from the first city in the list
    path = [start_city]
    
    while unvisited:
        current_city = path[-1]
        next_city = min(unvisited,
                        key=lambda city: distances[(current_city, city)])
        path.append(next_city)
        unvisited.remove(next_city)
        
    # Return to the starting city
    # path.append(path[0])
    return path

def two_opt(path, distances):
    """
    Performs a 2-opt local search to attempt to improve the path.
    """
    improvement = True
    while improvement:
        improvement = False
        # We don't iterate through final city because path[-1] == path[0].
        for i in range(1, len(path) - 2):
            for j in range(i + 1, len(path) - 1):
                # skip adjacent indices
                if j - i == 1: 
                    continue
                old_dist = (distances[(path[i - 1], path[i])] +
                            distances[(path[j], path[j + 1])])
                new_dist = (distances[(path[i - 1], path[j])] +
                            distances[(path[i], path[j + 1])])
                if new_dist < old_dist:
                    path[i:j + 1] = reversed(path[i:j + 1])
                    improvement = True
                    break
            if improvement:
                break
    return path

def insert_knoxville(coordinates, distances, optimal_path):
    if 'Knoxville' not in coordinates:
        knoxville_coords = get_coordinates_and_distances(['Knoxville'])[0]['Knoxville']
        coordinates['Knoxville'] = knoxville_coords

    # Avoid inserting if Knoxville is already there
    if optimal_path[0] != 'Knoxville':
        optimal_path = ['Knoxville'] + optimal_path
    if optimal_path[-1] != 'Knoxville':
        optimal_path = optimal_path + ['Knoxville']

    return optimal_path

### New draw_map (Cartopy instead of Basemap)

def draw_map(ax, coordinates, path):
    ax.set_global()
    ax.add_feature(cfeature.LAND, facecolor='#2e8b57')
    ax.add_feature(cfeature.OCEAN, facecolor='#1e3f66')
    ax.add_feature(cfeature.COASTLINE)
    ax.add_feature(cfeature.BORDERS, linestyle=':')
    gl = ax.gridlines(draw_labels=False)
    gl.top_labels = gl.right_labels = False

    # Plot cities
    for city, (lat, lon) in coordinates.items():
        ax.plot(lon, lat, marker='o', markersize=6,
                markeredgecolor='white', markerfacecolor='black',
                transform=ccrs.PlateCarree(), zorder=5)

    # Use WGS84 geodesic model
    geod = Geodesic.WGS84

    for i in range(len(path) - 1):
        cityA, cityB = path[i], path[i + 1]
        latA, lonA = coordinates[cityA]
        latB, lonB = coordinates[cityB]

        line = geod.InverseLine(latA, lonA, latB, lonB)
        n_points = 30
        lats, lons = [], []

        for j in range(n_points + 1):
            s = j * line.s13 / n_points
            pos = line.Position(s, Geodesic.STANDARD | Geodesic.LONG_UNROLL)
            lats.append(pos['lat2'])
            lons.append(pos['lon2'])

        ax.plot(lons, lats,
                color='red',
                linestyle='--',
                linewidth=2,
                transform=ccrs.PlateCarree(),
                zorder=3)

### MAIN

if __name__ == "__main__":
    user_input = input("Enter a comma-separated list of cities: ")
    selected_cities = [city.strip() for city in user_input.split(",")]
    
    # Get city coords/distances
    coordinates, distances = get_coordinates_and_distances(selected_cities)
    
    # Compute a TSP path via nearest neighbor + 2-opt
    nn_path = tsp_nearest_neighbor(coordinates, distances)
    improved_path = two_opt(nn_path, distances)
    
    # Insert Knoxville into path (front and back)
    path_with_knoxville = insert_knoxville(coordinates, distances, improved_path)

    # Plot with Cartopy
    plt.figure(figsize=(19.2, 9.6))
    # Use a Mollweide projection to roughly match your old Basemap version
    ax = plt.axes(projection=ccrs.Mollweide(central_longitude=9)) # nine degrees is slightly better balanced :)
    
    draw_map(ax, coordinates, path_with_knoxville)

    plt.title("Optimal Trip Path, From and Back to Home")
    plt.show()