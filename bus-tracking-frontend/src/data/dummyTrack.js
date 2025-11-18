// Synthetic track coordinates sampled every ~0.5 seconds.
// These points roughly trace a loop around the Local city center.
const BASE_PATH = [
  { lat: 15.1500, lng: 76.9300 },
  { lat: 15.1503, lng: 76.9308 },
  { lat: 15.1508, lng: 76.9315 },
  { lat: 15.1515, lng: 76.9320 },
  { lat: 15.1521, lng: 76.9324 },
  { lat: 15.1528, lng: 76.9320 },
  { lat: 15.1532, lng: 76.9312 },
  { lat: 15.1534, lng: 76.9303 },
  { lat: 15.1530, lng: 76.9294 },
  { lat: 15.1523, lng: 76.9288 },
  { lat: 15.1515, lng: 76.9284 },
  { lat: 15.1507, lng: 76.9282 },
  { lat: 15.1499, lng: 76.9284 },
  { lat: 15.1492, lng: 76.9290 },
  { lat: 15.1489, lng: 76.9298 },
  { lat: 15.1488, lng: 76.9307 },
  { lat: 15.1492, lng: 76.9316 },
  { lat: 15.1498, lng: 76.9323 },
  { lat: 15.1505, lng: 76.9326 },
  { lat: 15.1512, lng: 76.9324 },
  { lat: 15.1518, lng: 76.9319 },
  { lat: 15.1522, lng: 76.9312 },
  { lat: 15.1523, lng: 76.9304 },
  { lat: 15.1519, lng: 76.9296 },
  { lat: 15.1513, lng: 76.9292 },
  { lat: 15.1506, lng: 76.9290 },
  { lat: 15.1499, lng: 76.9292 },
  { lat: 15.1494, lng: 76.9298 },
  { lat: 15.1492, lng: 76.9306 },
  { lat: 15.1494, lng: 76.9314 },
  { lat: 15.1500, lng: 76.9320 },
  { lat: 15.1507, lng: 76.9323 },
  { lat: 15.1513, lng: 76.9321 },
  { lat: 15.1518, lng: 76.9316 },
  { lat: 15.1520, lng: 76.9310 },
  { lat: 15.1518, lng: 76.9303 },
  { lat: 15.1513, lng: 76.9298 },
  { lat: 15.1507, lng: 76.9296 },
  { lat: 15.1502, lng: 76.9298 },
  { lat: 15.1500, lng: 76.9305 },
];

export const DUMMY_TRACKS = {
  default: BASE_PATH,
};

export const TRACK_INTERVAL_MS = 500; // 0.5 seconds between samples

