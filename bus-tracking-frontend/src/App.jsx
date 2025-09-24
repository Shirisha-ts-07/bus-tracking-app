import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "520px",
};

const CITY_PRESETS = {
  Ballari: { lat: 15.1394, lng: 76.9214 },
  Gadag: { lat: 15.4310, lng: 75.6350 },
  Raichur: { lat: 16.2066, lng: 77.3463 },
};

const CITY_STOPS = {
  Ballari: [
    { id: 'BALLARI_GANDHI', name: 'Gandhi Chowk', lat: 15.1452, lng: 76.9237 },
    { id: 'BALLARI_STATION', name: 'Railway Station', lat: 15.1508, lng: 76.9194 },
  ],
  Gadag: [
    { id: 'GADAG_BUSSTAND', name: 'Bus Stand', lat: 15.4319, lng: 75.6359 },
    { id: 'GADAG_CIRCLE', name: 'Saraswati Circle', lat: 15.4249, lng: 75.6262 },
  ],
  Raichur: [
    { id: 'RAICHUR_BUSSTAND', name: 'Bus Stand', lat: 16.2028, lng: 77.3551 },
    { id: 'RAICHUR_FORT', name: 'Raichur Fort', lat: 16.2079, lng: 77.3530 },
  ],
};

function App() {
  const [buses, setBuses] = useState([]);
  const [backendStatus, setBackendStatus] = useState({ healthy: false, version: "" });
  const [city, setCity] = useState("Ballari");
  const [center, setCenter] = useState(CITY_PRESETS["Ballari"]);
  const [query, setQuery] = useState({ from: "Ballari", fromId: "", to: "Raichur", toId: "", date: "" });
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [lastRequestUrl, setLastRequestUrl] = useState("");
  const [lastResponsePreview, setLastResponsePreview] = useState("");
  const [lastError, setLastError] = useState("");

  // Smooth marker animation: track target positions and interpolate
  const targetsRef = React.useRef(new Map()); // busId -> {lat, lng}
  const animatingRef = React.useRef(false);
  const [renderPositions, setRenderPositions] = useState(new Map()); // busId -> {lat, lng}
  const [selectedStop, setSelectedStop] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [notifyGranted, setNotifyGranted] = useState(false);

  // Keep a map by bus_id/number for quick updates
  const upsertBus = (incoming) => {
    setBuses((prev) => {
      const list = [...prev];
      const idx = list.findIndex((b) => (b.bus_id ?? b.number) === (incoming.bus_id ?? incoming.number));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...incoming };
      } else {
        list.push(incoming);
      }
      return list;
    });
  };

  // Polling fallback for positions (snapshot)
  useEffect(() => {
    let active = true;
    const fetchSnapshot = async () => {
      try {
        const res = await axios.get("/api/positions");
        if (!active) return;
        const items = res.data?.map((p) => ({
          bus_id: p.bus_id,
          number: p.bus_id,
          latitude: p.latitude,
          longitude: p.longitude,
          eta: 5,
        })) || [];
        setBuses(items);
        // seed targets and render positions on first load
        const t = new Map(targetsRef.current);
        const r = new Map(renderPositions);
        for (const b of items) {
          t.set(b.bus_id, { lat: b.latitude, lng: b.longitude });
          if (!r.has(b.bus_id)) r.set(b.bus_id, { lat: b.latitude, lng: b.longitude });
        }
        targetsRef.current = t;
        setRenderPositions(r);
      } catch (_) {}
    };
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 10000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Update center when city changes
  useEffect(() => {
    setCenter(CITY_PRESETS[city]);
    setSelectedStop(null);
  }, [city]);

  // SSE real-time subscription
  useEffect(() => {
    const es = new EventSource("/api/stream/positions");
    const onMessage = (ev) => {
      if (!ev?.data) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "position") {
          const p = msg.payload;
          upsertBus({ bus_id: p.bus_id, number: p.bus_id, latitude: p.latitude, longitude: p.longitude });
          // update target for animation
          const t = new Map(targetsRef.current);
          t.set(p.bus_id, { lat: p.latitude, lng: p.longitude });
          targetsRef.current = t;
          // kick animation loop
          if (!animatingRef.current) {
            animatingRef.current = true;
            const step = () => {
              let changed = false;
              setRenderPositions((prev) => {
                const next = new Map(prev);
                for (const [busId, target] of targetsRef.current.entries()) {
                  const cur = next.get(busId) || target;
                  const dx = target.lat - cur.lat;
                  const dy = target.lng - cur.lng;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 0.00001) {
                    const frac = 0.25; // move 25% toward target per frame
                    const lat = cur.lat + dx * frac;
                    const lng = cur.lng + dy * frac;
                    next.set(busId, { lat, lng });
                    changed = true;
                  } else {
                    next.set(busId, target);
                  }
                }
                return next;
              });
              if (changed) requestAnimationFrame(step);
              else animatingRef.current = false;
            };
            requestAnimationFrame(step);
          }
        }
      } catch (_) {}
    };
    es.onmessage = onMessage;
    es.onerror = () => { /* silently rely on polling */ };
    return () => es.close();
  }, []);

  // Notification opt-in banner and mock ETA toasts
  useEffect(() => {
    if ("Notification" in window) {
      setNotifyGranted(Notification.permission === 'granted');
    }
  }, []);

  const requestNotify = async () => {
    try {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      setNotifyGranted(perm === 'granted');
      if (perm === 'granted') {
        pushToast("Notifications enabled. You'll get ETA updates here.");
      }
    } catch (_) {}
  };

  const pushToast = (text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // Demo: when arrivals sheet opens, show a mock ETA toast
  useEffect(() => {
    if (selectedStop) {
      pushToast(`ETA updates for ${selectedStop.name} will appear here.`);
    }
  }, [selectedStop]);

  // Check backend health + version
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const [health, version] = await Promise.all([
          axios.get("/healthz"),
          axios.get("/version"),
        ]);
        setBackendStatus({ healthy: health.data?.status === "ok", version: version.data?.version || "" });
      } catch (e) {
        setBackendStatus({ healthy: false, version: "" });
      }
    };
    checkBackend();
    const id = setInterval(checkBackend, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="app-header">
        <div className="app-title">🚍 Bus Tracker <span className="app-sub">Small city live map</span></div>
        <div className={`badge ${backendStatus.healthy ? 'success' : 'danger'}`}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: backendStatus.healthy ? 'var(--success)' : 'var(--danger)' }} />
          {backendStatus.healthy ? `Backend OK · v${backendStatus.version}` : 'Backend Unavailable'}
        </div>
      </div>

      <div className="container">
        <div className="row">
          <div className="card map-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Map</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>City</span>
                <select value={city} onChange={(e) => setCity(e.target.value)} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
                  {Object.keys(CITY_PRESETS).map((c) => (
                    <option key={c} value={c} style={{ color: '#000' }}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <LoadScript googleMapsApiKey="YOUR_API_KEY">
                <GoogleMap mapContainerClassName="map-container" mapContainerStyle={containerStyle} center={center} zoom={13}>
                  {buses.map((bus, index) => {
                    const pos = renderPositions.get(bus.bus_id) || { lat: bus.latitude, lng: bus.longitude };
                    return (
                      <Marker key={bus.bus_id ?? index} position={pos} label={(bus.number ?? bus.bus_id).toString()} />
                    );
                  })}
                  {CITY_STOPS[city].map((s) => (
                    <Marker key={s.id} position={{ lat: s.lat, lng: s.lng }} label="S" onClick={() => setSelectedStop(s)} />
          ))}
        </GoogleMap>
      </LoadScript>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Search buses</div>
            <div className="card-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoadingResults(true);
                setLastError("");
                try {
                  // proxy to local :8080 using /ext
                  const url = `/ext/bus?fromPlaceName=${encodeURIComponent(query.from)}&startPlaceId=${encodeURIComponent(query.fromId)}&toPlaceName=${encodeURIComponent(query.to)}&endPlaceId=${encodeURIComponent(query.toId)}&journeyDate=${encodeURIComponent(query.date)}`;
                  setLastRequestUrl(url);
                  const res = await axios.get(url);
                  const data = res.data;
                  setLastResponsePreview(typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data, null, 2).slice(0, 400));
                  setResults(Array.isArray(data) ? data : (data?.results || []));
                } catch (err) {
                  setLastResponsePreview("");
                  setLastError(err?.message || "Request failed");
                  setResults([]);
                } finally {
                  setLoadingResults(false);
                }
              }} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>From</div>
                    <input value={query.from} onChange={(e) => setQuery({ ...query, from: e.target.value })} placeholder="From city" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                    <input value={query.fromId} onChange={(e) => setQuery({ ...query, fromId: e.target.value })} placeholder="From Place ID (optional)" style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>To</div>
                    <input value={query.to} onChange={(e) => setQuery({ ...query, to: e.target.value })} placeholder="To city" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                    <input value={query.toId} onChange={(e) => setQuery({ ...query, toId: e.target.value })} placeholder="To Place ID (optional)" style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Date (dd/mm/yyyy)</div>
                    <input value={query.date} onChange={(e) => setQuery({ ...query, date: e.target.value })} placeholder="26/10/2023" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                  </div>
                  <button type="submit" disabled={loadingResults} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(79,124,255,0.15)', color: '#dbe5ff', fontWeight: 600 }}>
                    {loadingResults ? 'Searching…' : 'Search'}
                  </button>
                </div>
              </form>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">Results</div>
                <div className="card-body">
                  {(lastRequestUrl || lastError || lastResponsePreview) && (
                    <div style={{ marginBottom: 12 }}>
                      {lastRequestUrl && <div className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>URL: {lastRequestUrl}</div>}
                      {lastError && <div style={{ color: 'var(--danger)', fontSize: 12 }}>Error: {lastError}</div>}
                      {lastResponsePreview && (
                        <pre style={{ maxHeight: 160, overflow: 'auto', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
{lastResponsePreview}
                        </pre>
                      )}
                    </div>
                  )}
                  <div className="panel-list">
                    {results.map((r, idx) => (
                      <div key={idx} className="bus-item" onClick={() => {
                        // Build a simple details object from result
                        const totalFare = r.fare || r.price || 0;
                        const depart = r.departureTime || r.dep || '—';
                        const arrive = r.arrivalTime || r.arr || '—';
                        setRouteDetails({
                          title: r.serviceName || r.busName || 'Bus service',
                          fare: totalFare,
                          times: { depart, arrive },
                          steps: [
                            { type: 'walk', summary: 'Walk to stop', minutes: 5 },
                            { type: 'bus', summary: (r.serviceName || r.busName || 'Bus') + ' segment', minutes: 45 },
                            { type: 'walk', summary: 'Walk to destination', minutes: 6 },
                          ],
                        });
                      }} style={{ cursor: 'pointer' }}>
                        <div className="bus-id">{r.serviceName || r.busName || 'Bus'}</div>
                        <div className="bus-meta">
                          <span className="muted">Dep: {depart || '-'}</span>
                          <span className="muted">Arr: {arrive || '-'}</span>
                        </div>
                        <div className="eta">{(r.fare || r.price) ? `₹${r.fare || r.price}` : ''}</div>
                      </div>
                    ))}
                    {results.length === 0 && !loadingResults && <div className="muted">No results</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedStop && (
        <div className="bottom-sheet">
          <div className="bottom-sheet-header">
            <div className="bottom-sheet-title">{selectedStop.name}</div>
            <button onClick={() => setSelectedStop(null)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>Close</button>
          </div>
          <div className="bottom-sheet-body">
            <div className="panel-list">
              {buses
                .map((b) => {
                  // naive ETA: rough distance to stop / constant speed
                  const pos = (renderPositions.get(b.bus_id) || { lat: b.latitude, lng: b.longitude });
                  const dx = pos.lat - selectedStop.lat;
                  const dy = pos.lng - selectedStop.lng;
                  const distKm = Math.hypot(dx, dy) * 111; // approx
                  const etaMin = Math.max(1, Math.round((distKm / 25) * 60)); // 25 km/h avg
                  return { ...b, etaCalc: etaMin };
                })
                .sort((a, b) => a.etaCalc - b.etaCalc)
                .slice(0, 6)
                .map((bus, idx) => (
                  <div className="bus-item" key={bus.bus_id ?? idx}>
                    <div className="bus-id">#{bus.number ?? bus.bus_id}</div>
                    <div className="bus-meta">
                      <span className="muted">ETA</span>
                    </div>
                    <div className="eta">{bus.etaCalc} min</div>
                  </div>
                ))}
              {buses.length === 0 && <div className="muted">No active buses near this stop</div>}
            </div>
          </div>
        </div>
      )}

      {routeDetails && (
        <div className="bottom-sheet">
          <div className="bottom-sheet-header">
            <div className="bottom-sheet-title">{routeDetails.title}</div>
            <button onClick={() => setRouteDetails(null)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>Close</button>
          </div>
          <div className="bottom-sheet-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="muted">Depart: {routeDetails.times.depart}</div>
              <div className="muted">Arrive: {routeDetails.times.arrive}</div>
            </div>
            <div className="panel-list">
              {routeDetails.steps.map((s, i) => (
                <div key={i} className="bus-item">
                  <div className="bus-id">{s.type === 'bus' ? 'Bus' : 'Walk'}</div>
                  <div className="bus-meta">
                    <span className="muted">{s.summary}</span>
                  </div>
                  <div className="eta">{s.minutes} min</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{routeDetails.fare ? `Total: ₹${routeDetails.fare}` : ''}</div>
              <button style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(34,197,94,0.15)', color: '#c7f9d4', fontWeight: 600 }}>Start</button>
            </div>
          </div>
        </div>
      )}

      {!notifyGranted && (
        <div className="bottom-sheet" style={{ left: 'auto', right: 16, bottom: 16, borderRadius: 12, width: 320 }}>
          <div className="bottom-sheet-body">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Enable notifications</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Get ETA and status updates during your trip.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={requestNotify} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(79,124,255,0.15)', color: '#dbe5ff', fontWeight: 600 }}>Allow</button>
              <button onClick={() => setNotifyGranted(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>Later</button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
}

export default App;