import csv
import os
from configurations import bus_collection

# Path to your CSV file
CSV_FILE = "KSRTC_Ticket_Booking_counter_Awatar_counters_1.csv"

def import_buses():
    if not os.path.exists(CSV_FILE):
        print(f"⚠️ File not found: {CSV_FILE}")
        return

    with open(CSV_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        buses = []

        for row in reader:
            bus = {
                "bus_number": row.get("Bus_No") or row.get("bus_no"),
                "service_name": row.get("Service_Name") or row.get("service"),
                "from": row.get("From"),
                "to": row.get("To"),
                "depart": row.get("Depart_Time") or row.get("depart"),
                "arrive": row.get("Arrive_Time") or row.get("arrive"),
                "fare": int(row.get("Fare", 0)),
                "seats": int(row.get("Seats", 0)),
            }
            buses.append(bus)

        if buses:
            bus_collection.insert_many(buses)
            print(f"✅ Inserted {len(buses)} buses into MongoDB")
        else:
            print("⚠️ No bus records found in CSV")

if __name__ == "__main__":
    import_buses()