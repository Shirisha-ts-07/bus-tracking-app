import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 17.385044, // Example: Hyderabad latitude
  lng: 78.486671, // Example: Hyderabad longitude
};

function App() {
  const [buses, setBuses] = useState([]);

  // Fetch bus data from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // For now, let’s use dummy data
        const response = {
          data: [
            { number: 12, latitude: 17.385, longitude: 78.486, eta: 6 },
            { number: 5, latitude: 17.390, longitude: 78.480, eta: 15 },
          ],
        };
        setBuses(response.data);
      } catch (error) {
        console.error("Error fetching bus data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>🚍 Lakshmipur Bus Tracker</h2>
      <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
        >
          {buses.map((bus, index) => (
            <Marker
              key={index}
              position={{ lat: bus.latitude, lng: bus.longitude }}
              label={bus.number.toString()}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h3>Nearest Stop: Gandhi Chowk</h3>
        {buses.map((bus, index) => (
          <p key={index}>
            Bus {bus.number} arriving in {bus.eta} mins
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;