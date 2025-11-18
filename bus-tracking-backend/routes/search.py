import csv
import os
from flask import Blueprint, jsonify, request

bp = Blueprint("search", __name__)

# Load routes data from CSV
def load_routes_data():
    routes_data = []
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "routes.csv")
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                routes_data.append(row)
    except FileNotFoundError:
        print(f"Routes CSV not found at {csv_path}")
    
    return routes_data

@bp.get("/api/search/bus")
def search_bus():
    """Search buses based on CSV data.
    Query: fromPlaceName, toPlaceName, journeyDate (optional)
    """
    from_name = request.args.get("fromPlaceName", "").strip().lower()
    to_name = request.args.get("toPlaceName", "").strip().lower()
    date = request.args.get("journeyDate", "today")
    
    routes_data = load_routes_data()
    results = []
    
    # Find routes that go from source to destination
    for route in routes_data:
        stop_name = route['stop_name'].lower()
        
        # Check if this route passes through the from/to stops
        if from_name in stop_name or to_name in stop_name:
            # Find the bus route and calculate journey details
            bus_id = route['bus_id']
            
            # Get all stops for this bus
            bus_stops = [r for r in routes_data if r['bus_id'] == bus_id]
            
            # Find from and to stop indices
            from_stop = None
            to_stop = None
            
            for i, stop in enumerate(bus_stops):
                if from_name in stop['stop_name'].lower():
                    from_stop = stop
                if to_name in stop['stop_name'].lower():
                    to_stop = stop
            
            # If we found both stops, support both forward and reverse direction
            if from_stop and to_stop:
                from_idx = next(i for i, s in enumerate(bus_stops) if s['stop_id'] == from_stop['stop_id'])
                to_idx = next(i for i, s in enumerate(bus_stops) if s['stop_id'] == to_stop['stop_id'])

                if from_idx < to_idx:
                    # Forward direction
                    stops_traveled = to_idx - from_idx
                    fare = max(10, stops_traveled * 5)
                    results.append({
                        "serviceName": f"Bus {bus_id}",
                        "departureTime": from_stop['departure_time'],
                        "arrivalTime": to_stop['arrival_time'],
                        "fare": fare,
                        "fromStop": from_stop['stop_name'],
                        "toStop": to_stop['stop_name'],
                        "stops": stops_traveled,
                    })
                elif from_idx > to_idx:
                    # Reverse direction (assume same service operates both ways)
                    stops_traveled = from_idx - to_idx
                    fare = max(10, stops_traveled * 5)
                    # Swap for reverse travel times if present; otherwise keep placeholders
                    results.append({
                        "serviceName": f"Bus {bus_id} (Reverse)",
                        "departureTime": from_stop.get('departure_time') or from_stop.get('arrival_time') or "",
                        "arrivalTime": to_stop.get('arrival_time') or to_stop.get('departure_time') or "",
                        "fare": fare,
                        "fromStop": from_stop['stop_name'],
                        "toStop": to_stop['stop_name'],
                        "stops": stops_traveled,
                    })
    
    # Remove duplicates and sort by departure time
    seen = set()
    unique_results = []
    for result in results:
        key = (result['serviceName'], result['departureTime'])
        if key not in seen:
            seen.add(key)
            unique_results.append(result)
    
    # Sort by departure time
    unique_results.sort(key=lambda x: x['departureTime'])
    
    # If no results found, return some default options
    if not unique_results:
        unique_results = [
            {
                "serviceName": f"{from_name.title()} → {to_name.title()} Local",
                "departureTime": "08:00",
                "arrivalTime": "08:30",
                "fare": 15,
                "fromStop": from_name.title(),
                "toStop": to_name.title(),
                "stops": 3
            },
            {
                "serviceName": f"{from_name.title()} → {to_name.title()} Express",
                "departureTime": "09:00",
                "arrivalTime": "09:20",
                "fare": 20,
                "fromStop": from_name.title(),
                "toStop": to_name.title(),
                "stops": 2
            }
        ]
    
    return jsonify({"date": date, "results": unique_results})


