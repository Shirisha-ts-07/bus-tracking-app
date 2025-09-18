from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import datetime

app = Flask(__name__)
CORS(app)

# Database connection
db = mysql.connector.connect(
    host="localhost",
    user="root",        # change to your MySQL username
    password="password", # change to your MySQL password
    database="transport_db"
)
cursor = db.cursor(dictionary=True)

# ------------------- APIs -------------------

# 1. Get all buses with live location
@app.route("/api/buses", methods=["GET"])
def get_buses():
    cursor.execute("SELECT * FROM buses")
    buses = cursor.fetchall()
    return jsonify(buses)

# 2. Get ETA for a specific bus (dummy calculation for now)
@app.route("/api/bus/<int:bus_id>/eta/<int:stop_id>", methods=["GET"])
def get_eta(bus_id, stop_id):
    # For now return random ETA (later calculate using distance + avg speed)
    eta = 5
    return jsonify({"bus_id": bus_id, "stop_id": stop_id, "eta": eta})

# 3. Get all routes
@app.route("/api/routes", methods=["GET"])
def get_routes():
    cursor.execute("SELECT * FROM routes")
    routes = cursor.fetchall()
    return jsonify(routes)

# 4. Book a ticket
@app.route("/api/ticket", methods=["POST"])
def book_ticket():
    data = request.json
    user_id = data["user_id"]
    bus_id = data["bus_id"]
    fare = data["fare"]

    query = "INSERT INTO tickets (user_id, bus_id, fare, timestamp) VALUES (%s,%s,%s,%s)"
    values = (user_id, bus_id, fare, datetime.datetime.now())
    cursor.execute(query, values)
    db.commit()

    return jsonify({"message": "Ticket booked successfully!"})

# 5. Add/update bus location (from GPS device or simulator)
@app.route("/api/bus/update_location", methods=["POST"])
def update_location():
    data = request.json
    bus_id = data["bus_id"]
    lat = data["latitude"]
    lng = data["longitude"]

    query = "UPDATE buses SET current_lat=%s, current_lng=%s WHERE bus_id=%s"
    cursor.execute(query, (lat, lng, bus_id))
    db.commit()

    return jsonify({"message": "Bus location updated successfully!"})

# ------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)