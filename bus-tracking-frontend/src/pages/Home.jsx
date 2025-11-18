import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { DUMMY_TRACKS, TRACK_INTERVAL_MS } from "../data/dummyTrack";

const containerStyle = {
  width: "100%",
  height: "520px",
};

const CITY_PRESETS = {
  Local: { lat: 15.1500, lng: 76.9300 },
};

const CITY_STOPS = {
  Local: [
    { id: 'LOCAL_SP_CIRCLE', name: 'SP circle', lat: 15.1510, lng: 76.9300 },
    { id: 'LOCAL_ROYAL_CIRCLE', name: 'Royal circle', lat: 15.1490, lng: 76.9280 },
    { id: 'LOCAL_MOTI_CIRCLE', name: 'Moti circle', lat: 15.1520, lng: 76.9340 },
    { id: 'LOCAL_COWL_BAZAAR', name: 'Cowl Bazaar', lat: 15.1460, lng: 76.9320 },
    { id: 'LOCAL_RADIO_PARK', name: 'Radio park', lat: 15.1530, lng: 76.9270 },
    { id: 'LOCAL_TILLAK_NAGAR', name: 'Tillak nagar', lat: 15.1480, lng: 76.9350 },
  ],
};

function Home() {
  const { isAuthenticated } = useAuth();
  const [buses, setBuses] = useState([]);
  const [backendStatus, setBackendStatus] = useState({ healthy: false, version: "" });
  const [city, setCity] = useState("Local");
  const [center, setCenter] = useState(CITY_PRESETS["Local"]);
  const [query, setQuery] = useState({ from: "SP circle", fromId: "", to: "Royal circle", toId: "", date: "20/11/2025" });
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
  const [toasts, setToasts] = useState([]);
  const [notifyGranted, setNotifyGranted] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null); // { busId, pathLabel }

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

  const ensureBusInList = (busId, fallbackPosition) => {
    setBuses((prev) => {
      const exists = prev.some((b) => (b.bus_id ?? b.number) === busId);
      if (exists) return prev;
      return [
        ...prev,
        {
          bus_id: busId,
          number: busId,
          latitude: fallbackPosition?.lat ?? center.lat,
          longitude: fallbackPosition?.lng ?? center.lng,
        },
      ];
    });
  };

  const handleTrackBus = (busId, result, idx) => {
    const path = DUMMY_TRACKS[busId] || DUMMY_TRACKS.default;
    if (!path || path.length === 0) {
      pushToast("No track data available for this bus yet.");
      return;
    }
    ensureBusInList(busId, path[0]);
    setRenderPositions((prev) => {
      const next = new Map(prev);
      next.set(busId, { lat: path[0].lat, lng: path[0].lng });
      return next;
    });
    setActiveTrack({ busId, pathLabel: busId, path });
    pushToast(`Tracking ${busId}…`);
  };

  // Demo: when arrivals sheet opens, show a mock ETA toast
  useEffect(() => {
    if (selectedStop) {
      pushToast(`ETA updates for ${selectedStop.name} will appear here.`);
    }
  }, [selectedStop]);

  useEffect(() => {
    if (!activeTrack) return;
    const { busId, path } = activeTrack;
    let step = 0;
    const interval = setInterval(() => {
      if (step >= path.length) {
        clearInterval(interval);
        setActiveTrack(null);
        pushToast(`Finished tracking ${busId}`);
        return;
      }
      const point = path[step];
      setRenderPositions((prev) => {
        const next = new Map(prev);
        next.set(busId, { lat: point.lat, lng: point.lng });
        return next;
      });
      step += 1;
    }, TRACK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeTrack]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(34,197,94,0.15)',
                color: '#c7f9d4',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'rgba(79,124,255,0.15)',
                color: '#dbe5ff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Login / Register
            </Link>
          )}
          <div className={`badge ${backendStatus.healthy ? 'success' : 'danger'}`}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: backendStatus.healthy ? 'var(--success)' : 'var(--danger)' }} />
            {backendStatus.healthy ? `Backend OK · v${backendStatus.version}` : 'Backend Unavailable'}
          </div>
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
              <LoadScript googleMapsApiKey="AIzaSyBMdJXKP46zZG3FuVTOhhHNJ-yRjgUBebg">
                <GoogleMap mapContainerClassName="map-container" mapContainerStyle={containerStyle} center={center} zoom={13}>
                  {buses.map((bus, index) => {
                    const pos = renderPositions.get(bus.bus_id) || { lat: bus.latitude, lng: bus.longitude };
                    const labelText = String(bus.number ?? bus.bus_id ?? '?');
                    return (
                      <Marker key={bus.bus_id ?? index} position={pos} label={labelText} />
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
                  let url = '';
                  let res;
                  if (!query.fromId || !query.toId || !query.date) {
                    // fallback to backend mock search when IDs/date missing
                    url = `/api/search/bus?fromPlaceName=${encodeURIComponent(query.from)}&toPlaceName=${encodeURIComponent(query.to)}&journeyDate=${encodeURIComponent(query.date || '')}`;
                    setLastRequestUrl(url);
                    res = await axios.get(url);
                  } else {
                    // proxy to local :8080 using /ext when all params present
                    url = `/ext/bus?fromPlaceName=${encodeURIComponent(query.from)}&startPlaceId=${encodeURIComponent(query.fromId)}&toPlaceName=${encodeURIComponent(query.to)}&endPlaceId=${encodeURIComponent(query.toId)}&journeyDate=${encodeURIComponent(query.date)}`;
                    setLastRequestUrl(url);
                    res = await axios.get(url);
                  }
                  const data = res.data;
                  console.log('Search response:', data);
                  setLastResponsePreview(typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data, null, 2).slice(0, 400));
                  const resultsArray = Array.isArray(data) ? data : (data?.results || []);
                  console.log('Setting results:', resultsArray);
                  setResults(resultsArray);
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
                    <input value={query.date} onChange={(e) => setQuery({ ...query, date: e.target.value })} placeholder="20/11/2025" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <button type="submit" disabled={loadingResults} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(79,124,255,0.15)', color: '#dbe5ff', fontWeight: 600, width: '100%' }}>
                      {loadingResults ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">Results</div>
                <div className="card-body">
                  {lastError && (
                    <div style={{ marginBottom: 12, color: 'var(--danger)', fontSize: 12 }}>Error: {lastError}</div>
                  )}
                  <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--muted)' }}>
                    Debug: {results.length} results found
                  </div>
                  <div className="panel-list">
                    {results.map((r, idx) => {
                      const totalFare = r.fare || r.price || 0;
                      const depart = r.departureTime || r.dep || '—';
                      const arrive = r.arrivalTime || r.arr || '—';
                      const title = r.serviceName || r.busName || 'Bus service';
                      const busId = r.bus_id || title || `bus-${idx}`;
                      return (
                        <div key={idx} className="bus-item" style={{ gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div className="bus-id">{title}</div>
                            <div className="bus-meta">
                              <span className="muted">Dep: {depart || '-'}</span>
                              <span className="muted">Arr: {arrive || '-'}</span>
                            </div>
                            <div className="eta">{totalFare ? `₹${totalFare}` : ''}</div>
                          </div>
                          <button
                            onClick={() => handleTrackBus(busId, r, idx)}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(34,197,94,0.15)', color: '#c7f9d4', fontWeight: 600 }}
                          >
                            {activeTrack?.busId === busId ? 'Tracking…' : 'Track Bus'}
                          </button>
                        </div>
                      );
                    })}
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

export default Home;

