from fastapi import Query

@app.get("/api/search")
async def search_buses(source: str = Query(...), destination: str = Query(...)):
    query = {"from": {"$regex": source, "$options": "i"}, "to": {"$regex": destination, "$options": "i"}}
    buses = bus_collection.find(query)
    return [
        {
            "bus_number": bus.get("bus_number"),
            "service_name": bus.get("service_name"),
            "from": bus.get("from"),
            "to": bus.get("to"),
            "depart": bus.get("depart"),
            "arrive": bus.get("arrive"),
            "fare": bus.get("fare"),
            "seats": bus.get("seats"),
        }
        for bus in buses
    ]