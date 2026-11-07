'use strict';
/**
 * centerApplications.validators.test.js
 *
 * Tests for the Phase 5B center-admin application validators.
 * Run with: npm run test:phase5b
 * Uses only Node's built-in node:test and node:assert — no extra packages.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  listApplicationsQuerySchema,
  uuidParamSchema,
  noteBodySchema,
} = require('./centerApplications.validators');

// ── listApplicationsQuerySchema ─────────────────────────────────────────────

test('valid status values pass: pending', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'pending' });
  assert.equal(r.success, true);
  assert.equal(r.data.status, 'pending');
});

test('valid status values pass: approved', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'approved' });
  assert.equal(r.success, true);
});

test('valid status values pass: rejected', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'rejected' });
  assert.equal(r.success, true);
});

test('valid status values pass: not_selected', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'not_selected' });
  assert.equal(r.success, true);
});

test('valid status values pass: cancelled', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'cancelled' });
  assert.equal(r.success, true);
});

test('valid status values pass: all', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'all' });
  assert.equal(r.success, true);
});

test('missing status defaults to pending', () => {
  const r = listApplicationsQuerySchema.safeParse({});
  assert.equal(r.success, true);
  assert.equal(r.data.status, 'pending');
});

test('invalid status value fails', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'unknown_status' });
  assert.equal(r.success, false);
  const msg = r.error.issues[0].message;
  assert.match(msg, /pending.*approved.*rejected/i);
});

test('unknown query key fails (strict)', () => {
  const r = listApplicationsQuerySchema.safeParse({ status: 'pending', extra: 'bad' });
  assert.equal(r.success, false);
});

// ── uuidParamSchema ─────────────────────────────────────────────────────────

test('valid UUID passes', () => {
  const r = uuidParamSchema.safeParse('a1b2c3d4-e5f6-4a7b-8c9d-000000000001');
  assert.equal(r.success, true);
});

test('invalid UUID fails', () => {
  const r = uuidParamSchema.safeParse('not-a-uuid');
  assert.equal(r.success, false);
  assert.match(r.error.issues[0].message, /invalid application id/i);
});

test('empty string UUID fails', () => {
  const r = uuidParamSchema.safeParse('');
  assert.equal(r.success, false);
});

// ── noteBodySchema ──────────────────────────────────────────────────────────

test('empty body (no note) passes, note is undefined', () => {
  const r = noteBodySchema.safeParse({});
  assert.equal(r.success, true);
  assert.equal(r.data.note, undefined);
});

test('note with valid text passes', () => {
  const r = noteBodySchema.safeParse({ note: 'Great application!' });
  assert.equal(r.success, true);
  assert.equal(r.data.note, 'Great application!');
});

test('note of exactly 500 characters passes', () => {
  const r = noteBodySchema.safeParse({ note: 'a'.repeat(500) });
  assert.equal(r.success, true);
  assert.equal(r.data.note?.length, 500);
});

test('note over 500 characters fails', () => {
  const r = noteBodySchema.safeParse({ note: 'a'.repeat(501) });
  assert.equal(r.success, false);
  assert.match(r.error.issues[0].message, /at most 500/i);
});

test('all-spaces note becomes null after transform', () => {
  const r = noteBodySchema.safeParse({ note: '    ' });
  assert.equal(r.success, true);
  assert.equal(r.data.note, null);
});

test('empty-string note becomes null after transform', () => {
  const r = noteBodySchema.safeParse({ note: '' });
  assert.equal(r.success, true);
  assert.equal(r.data.note, null);
});

test('unknown body key fails (strict)', () => {
  const r = noteBodySchema.safeParse({ note: 'ok', extra: 'bad' });
  assert.equal(r.success, false);
});

test('note is trimmed before length check', () => {
  // A 499-char string padded with spaces on both sides must still pass
  const r = noteBodySchema.safeParse({ note: ' ' + 'a'.repeat(499) + ' ' });
  assert.equal(r.success, true);
  assert.equal(r.data.note?.length, 499);
});

