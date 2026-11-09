'use strict';
/**
 * Tests for Phase 5B and Phase 5C email builder functions in email.js.
 * Uses node:test and node:assert only — no extra dependencies.
 *
 * Run:  node --test src/utils/email.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  getApplicationApprovedEmail,
  getApplicationRejectedEmail,
  getApplicationNotSelectedEmail,
  getApplicationCancelledByCenterEmail,
  getApplicationAnimalRemovedEmail,
  getApplicationCenterUnavailableEmail,
} = require('./email');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns sample args for getApplicationApprovedEmail */
function approvedArgs(overrides = {}) {
  return {
    adopterName:       'Jane Doe',
    animalName:        'Biscuit',
    centerName:        'Happy Paws Center',
    centerAddress:     '12 Main St, Springfield',
    centerPhone:       '+1-800-555-0100',
    centerContactEmail:'info@happypaws.example.com',
    note:              null,
    ...overrides,
  };
}

/** Returns sample args for getApplicationRejectedEmail */
function rejectedArgs(overrides = {}) {
  return {
    adopterName: 'Jane Doe',
    animalName:  'Biscuit',
    centerName:  'Happy Paws Center',
    note:        null,
    ...overrides,
  };
}

/** Returns sample args for getApplicationNotSelectedEmail */
function notSelectedArgs(overrides = {}) {
  return { adopterName: 'Jane Doe', animalName: 'Biscuit', ...overrides };
}

/** Returns sample args for getApplicationCancelledByCenterEmail */
function cancelledArgs(overrides = {}) {
  return { adopterName: 'Jane Doe', animalName: 'Biscuit', ...overrides };
}

const XSS = '<script>alert(1)</script>';
const XSS_SAFE = '&lt;script&gt;alert(1)&lt;/script&gt;';

// ── getApplicationApprovedEmail ───────────────────────────────────────────────

describe('getApplicationApprovedEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationApprovedEmail(approvedArgs());
    assert.ok(typeof result.subject === 'string' && result.subject.length > 0, 'subject non-empty');
    assert.ok(typeof result.text   === 'string' && result.text.length   > 0, 'text non-empty');
    assert.ok(typeof result.html   === 'string' && result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in adopterName in HTML', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({ adopterName: XSS }));
    assert.ok(!html.includes('<script'), `html must not contain raw <script>; got: ${html.slice(0, 300)}`);
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({ animalName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in note in HTML', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({ note: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('HTML contains center address', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs());
    assert.ok(html.includes('12 Main St, Springfield'), 'html must include centerAddress');
  });

  it('HTML contains center phone', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs());
    assert.ok(html.includes('+1-800-555-0100'), 'html must include centerPhone');
  });

  it('HTML contains center contact email', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs());
    assert.ok(html.includes('info@happypaws.example.com'), 'html must include centerContactEmail');
  });

  it('HTML does not include address/phone/contactEmail rows when all are empty', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({
      centerAddress:      '',
      centerPhone:        '',
      centerContactEmail: '',
    }));
    assert.ok(!html.includes('12 Main St'), 'no address when empty');
    assert.ok(!html.includes('+1-800'), 'no phone when empty');
    assert.ok(!html.includes('info@'), 'no contact email when empty');
  });

  it('note block is included when note is provided', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({ note: 'Come at 10am.' }));
    assert.ok(html.includes('Come at 10am.'), 'html includes note text');
  });

  it('note block is absent when note is null', () => {
    const { html } = getApplicationApprovedEmail(approvedArgs({ note: null }));
    assert.ok(!html.includes('Note from the center'), 'html has no note block when note=null');
  });
});

// ── getApplicationRejectedEmail ───────────────────────────────────────────────

describe('getApplicationRejectedEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationRejectedEmail(rejectedArgs());
    assert.ok(result.subject.length > 0, 'subject non-empty');
    assert.ok(result.text.length   > 0, 'text non-empty');
    assert.ok(result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in adopterName in HTML', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs({ adopterName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs({ animalName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
  });

  it('escapes XSS in note in HTML', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs({ note: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('note block is included when note is provided', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs({ note: 'Missing vet records.' }));
    assert.ok(html.includes('Missing vet records.'), 'html includes note text');
  });

  it('note block is absent when note is null', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs({ note: null }));
    assert.ok(!html.includes('Note from the center'), 'html has no note block when note=null');
  });

  it('does NOT contain center address, phone, or contact email', () => {
    const { html } = getApplicationRejectedEmail(rejectedArgs());
    // These fields are not passed to the rejected builder
    assert.ok(!html.includes('12 Main St'), 'no address in rejected email');
    assert.ok(!html.includes('+1-800'), 'no phone in rejected email');
  });
});

// ── getApplicationNotSelectedEmail ────────────────────────────────────────────

describe('getApplicationNotSelectedEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationNotSelectedEmail(notSelectedArgs());
    assert.ok(result.subject.length > 0, 'subject non-empty');
    assert.ok(result.text.length   > 0, 'text non-empty');
    assert.ok(result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in adopterName in HTML', () => {
    const { html } = getApplicationNotSelectedEmail(notSelectedArgs({ adopterName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationNotSelectedEmail(notSelectedArgs({ animalName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
  });

  it('does NOT contain center contact details (address / phone / email)', () => {
    // The not_selected template must never expose center contact details
    const { html, text } = getApplicationNotSelectedEmail(notSelectedArgs());
    // These strings should not appear anywhere since the builder doesn't receive them
    assert.ok(!html.includes('centerAddress'),      'html: no raw key');
    assert.ok(!html.includes('centerPhone'),        'html: no raw key');
    assert.ok(!html.includes('centerContactEmail'), 'html: no raw key');
    assert.ok(!text.includes('centerAddress'),      'text: no raw key');
  });
});

// ── getApplicationCancelledByCenterEmail ──────────────────────────────────────

describe('getApplicationCancelledByCenterEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationCancelledByCenterEmail(cancelledArgs());
    assert.ok(result.subject.length > 0, 'subject non-empty');
    assert.ok(result.text.length   > 0, 'text non-empty');
    assert.ok(result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in adopterName in HTML', () => {
    const { html } = getApplicationCancelledByCenterEmail(cancelledArgs({ adopterName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationCancelledByCenterEmail(cancelledArgs({ animalName: XSS }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
  });

  it('does NOT contain center contact details (address / phone / email)', () => {
    const { html, text } = getApplicationCancelledByCenterEmail(cancelledArgs());
    assert.ok(!html.includes('centerAddress'),      'html: no raw key');
    assert.ok(!html.includes('centerPhone'),        'html: no raw key');
    assert.ok(!html.includes('centerContactEmail'), 'html: no raw key');
    assert.ok(!text.includes('centerAddress'),      'text: no raw key');
  });
});


// ── getApplicationAnimalRemovedEmail (Phase 5C) ───────────────────────────────

function animalRemovedArgs(overrides = {}) {
  return { applicantName: 'Jane Doe', animalName: 'Biscuit', centerName: 'Happy Paws', ...overrides };
}

describe('getApplicationAnimalRemovedEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationAnimalRemovedEmail(animalRemovedArgs());
    assert.ok(result.subject.length > 0, 'subject non-empty');
    assert.ok(result.text.length   > 0, 'text non-empty');
    assert.ok(result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in applicantName in HTML', () => {
    const { html } = getApplicationAnimalRemovedEmail(animalRemovedArgs({ applicantName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationAnimalRemovedEmail(animalRemovedArgs({ animalName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in centerName in HTML', () => {
    const { html } = getApplicationAnimalRemovedEmail(animalRemovedArgs({ centerName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('mentions the animal name and center name in the text body', () => {
    const { text } = getApplicationAnimalRemovedEmail(animalRemovedArgs());
    assert.ok(text.includes('Biscuit'),     'text includes animal name');
    assert.ok(text.includes('Happy Paws'), 'text includes center name');
  });
});

// ── getApplicationCenterUnavailableEmail (Phase 5C) ───────────────────────────

function centerUnavailableArgs(overrides = {}) {
  return { applicantName: 'Jane Doe', animalName: 'Biscuit', centerName: 'Happy Paws', ...overrides };
}

describe('getApplicationCenterUnavailableEmail', () => {
  it('returns non-empty subject, text, and html', () => {
    const result = getApplicationCenterUnavailableEmail(centerUnavailableArgs());
    assert.ok(result.subject.length > 0, 'subject non-empty');
    assert.ok(result.text.length   > 0, 'text non-empty');
    assert.ok(result.html.length   > 0, 'html non-empty');
  });

  it('escapes XSS in applicantName in HTML', () => {
    const { html } = getApplicationCenterUnavailableEmail(centerUnavailableArgs({ applicantName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in animalName in HTML', () => {
    const { html } = getApplicationCenterUnavailableEmail(centerUnavailableArgs({ animalName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('escapes XSS in centerName in HTML', () => {
    const { html } = getApplicationCenterUnavailableEmail(centerUnavailableArgs({ centerName: '<script>alert(1)</script>' }));
    assert.ok(!html.includes('<script'), 'html must not contain raw <script>');
    assert.ok(html.includes('&lt;script'), 'html must contain escaped form');
  });

  it('never contains the word "suspend" in subject, text, or html', () => {
    const { subject, text, html } = getApplicationCenterUnavailableEmail(centerUnavailableArgs());
    const lowerSubject = subject.toLowerCase();
    const lowerText    = text.toLowerCase();
    const lowerHtml    = html.toLowerCase();
    assert.ok(!lowerSubject.includes('suspend'), 'subject must not contain "suspend"');
    assert.ok(!lowerText.includes('suspend'),    'text must not contain "suspend"');
    assert.ok(!lowerHtml.includes('suspend'),    'html must not contain "suspend"');
  });

  it('mentions the center is not accepting applications', () => {
    const { text } = getApplicationCenterUnavailableEmail(centerUnavailableArgs());
    assert.ok(
      text.toLowerCase().includes('not currently accepting applications'),
      'text must say center is not currently accepting applications',
    );
  });
});
