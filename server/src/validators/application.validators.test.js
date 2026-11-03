/**
 * server/src/validators/application.validators.test.js
 *
 * Tests for the Phase 5A application submission schema.
 * Run with:  npm run test:applications
 * Uses only Node's built-in node:test and node:assert — no extra packages.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitApplicationSchema } = require('./application.validators');

// ---------------------------------------------------------------------------
// Canonical valid body used as the baseline for all rejection tests.
// animal_id: use a real animal UUID from your database when testing via curl.
// ---------------------------------------------------------------------------
const VALID_BODY = {
  animal_id: 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001',  // replace with REAL-ANIMAL-ID
  form_data: {
    full_name:           'Jane Smith',
    phone:               '+91 98765 43210',
    email:               'jane@example.com',
    address:             '12 Elm Street, Mumbai',
    is_adult:            true,
    home_type:           'apartment',
    ownership:           'rented',
    landlord_permission: true,
    outdoor_space:       false,
    adults_count:        2,
    children:            'none',
    other_pets:          'none',
    had_pets_before:     true,
    pet_details:         '1 dog for 5 years',
    hours_alone:         4,
    reason:              'I have always wanted to give a rescue animal a loving home.',
    caregiver:           'Myself',
    vet_commitment:      true,
    consent_visit:       true,
    consent_policy:      true,
  },
};

/** Deep-clone so each test gets an independent copy. */
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

/** Assert that the schema rejects the given body. Returns the first error message. */
function assertFails(body) {
  const r = submitApplicationSchema.safeParse(body);
  assert.equal(r.success, false, 'Expected validation to fail but it passed.');
  return r.error.issues[0].message;
}

/** Assert that the schema accepts the given body. */
function assertPasses(body) {
  const r = submitApplicationSchema.safeParse(body);
  assert.equal(r.success, true,
    r.success ? '' : 'Expected validation to pass but it failed: ' + r.error.issues[0].message);
}

// ---------------------------------------------------------------------------
// (i) One fully valid body passes
// ---------------------------------------------------------------------------
test('valid body passes', () => {
  assertPasses(VALID_BODY);
});

// ---------------------------------------------------------------------------
// (ii) Rejection cases — one per scenario
// ---------------------------------------------------------------------------

test('rejects unknown key in form_data', () => {
  const b = clone(VALID_BODY);
  b.form_data.unexpected_key = 'hello';
  const msg = assertFails(b);
  assert.match(msg, /unrecognized key/i);
});

test('rejects unknown top-level key', () => {
  const b = clone(VALID_BODY);
  b.extra_top = 'hello';
  const msg = assertFails(b);
  assert.match(msg, /unrecognized key/i);
});

test('rejects invalid animal_id', () => {
  const b = clone(VALID_BODY);
  b.animal_id = 'not-a-uuid';
  const msg = assertFails(b);
  assert.match(msg, /invalid animal/i);
});

test('rejects consent_policy false', () => {
  const b = clone(VALID_BODY);
  b.form_data.consent_policy = false;
  assertFails(b);
});

test('rejects consent_visit false', () => {
  const b = clone(VALID_BODY);
  b.form_data.consent_visit = false;
  assertFails(b);
});

test('rejects vet_commitment false', () => {
  const b = clone(VALID_BODY);
  b.form_data.vet_commitment = false;
  assertFails(b);
});

test('rejects is_adult false', () => {
  const b = clone(VALID_BODY);
  b.form_data.is_adult = false;
  assertFails(b);
});

test('rejects rented home with landlord_permission null', () => {
  const b = clone(VALID_BODY);
  b.form_data.ownership = 'rented';
  b.form_data.landlord_permission = null;
  const msg = assertFails(b);
  assert.match(msg, /landlord/i);
});

test('rejects owned home with landlord_permission true', () => {
  const b = clone(VALID_BODY);
  b.form_data.ownership = 'owned';
  b.form_data.landlord_permission = true;
  const msg = assertFails(b);
  assert.match(msg, /landlord/i);
});

test('rejects hours_alone 25 (above max)', () => {
  const b = clone(VALID_BODY);
  b.form_data.hours_alone = 25;
  const msg = assertFails(b);
  assert.match(msg, /at most 24/i);
});

test('rejects reason shorter than 20 characters', () => {
  const b = clone(VALID_BODY);
  b.form_data.reason = 'Too short';
  const msg = assertFails(b);
  assert.match(msg, /at least 20/i);
});

test('rejects a required string that is only spaces', () => {
  const b = clone(VALID_BODY);
  b.form_data.children = '   ';   // trimmed → empty
  assertFails(b);
});

test('rejects adults_count sent as a string "2" (no coerce)', () => {
  const b = clone(VALID_BODY);
  b.form_data.adults_count = '2';  // must be a real number, not a string
  assertFails(b);
});

test('rejects invalid phone (too short)', () => {
  const b = clone(VALID_BODY);
  b.form_data.phone = '123';
  const msg = assertFails(b);
  assert.match(msg, /phone/i);
});
