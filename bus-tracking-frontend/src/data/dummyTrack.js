// Road-like synthetic path between SP circle and Royal circle (Bellary)
// This is a hand-crafted, denser list of points that follows a plausible road segment
// between the two stops. Points progress smoothly so animation looks natural.
const BASE_PATH = [
  // start: SP circle
  { lat: 15.1510, lng: 76.9300 },
  { lat: 15.1508, lng: 76.9298 },
  { lat: 15.1506, lng: 76.9296 },
  { lat: 15.1504, lng: 76.9294 },
  { lat: 15.1502, lng: 76.9292 },
  { lat: 15.1500, lng: 76.9290 },
  { lat: 15.1498, lng: 76.9288 },
  { lat: 15.1496, lng: 76.9286 },
  { lat: 15.1494, lng: 76.9284 },
  { lat: 15.1492, lng: 76.9282 },
  // Royal circle (near)
  { lat: 15.1490, lng: 76.9280 },
  // continue along a short route past Royal to make a natural short line
  { lat: 15.1489, lng: 76.9278 },
  { lat: 15.1488, lng: 76.9276 },
  { lat: 15.1487, lng: 76.9274 },
  { lat: 15.1486, lng: 76.9272 },
  { lat: 15.1486, lng: 76.9270 },
  // curve back toward SP circle via a slightly different road to produce a route
  { lat: 15.1490, lng: 76.9276 },
  { lat: 15.1494, lng: 76.9280 },
  { lat: 15.1498, lng: 76.9284 },
  { lat: 15.1502, lng: 76.9288 },
  { lat: 15.1506, lng: 76.9292 },
  { lat: 15.1509, lng: 76.9296 },
  { lat: 15.1511, lng: 76.9299 },
  { lat: 15.1510, lng: 76.9300 },
  // small loop to avoid perfectly straight motion and make it feel like a route
  { lat: 15.1512, lng: 76.9303 },
  { lat: 15.1514, lng: 76.9306 },
  { lat: 15.1516, lng: 76.9305 },
  { lat: 15.1515, lng: 76.9302 },
  { lat: 15.1513, lng: 76.9301 },
  { lat: 15.1510, lng: 76.9300 },
];

export const DUMMY_TRACKS = {
  default: BASE_PATH,
};

// Make animation more realistic: 5000ms (5 seconds) between samples
export const TRACK_INTERVAL_MS = 5000; // 5 seconds between samples

