const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm } = require('./distance');

test('distance: identical points return 0', () => {
  const d = haversineKm(13.0827, 80.2707, 13.0827, 80.2707);
  assert.equal(d, 0);
});

test('distance: Chennai to Bengaluru is between 285 and 295 km', () => {
  // Chennai (13.0827, 80.2707) to Bengaluru (12.9716, 77.5946)
  const d = haversineKm(13.0827, 80.2707, 12.9716, 77.5946);
  assert.ok(d >= 285 && d <= 295, `Expected distance between 285 and 295 km, got ${d}`);
});

test('distance: returns same value when two points are swapped', () => {
  const d1 = haversineKm(13.0827, 80.2707, 12.9716, 77.5946);
  const d2 = haversineKm(12.9716, 77.5946, 13.0827, 80.2707);
  assert.equal(d1, d2);
});
