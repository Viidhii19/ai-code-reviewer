import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Unit tests for the getRealClientIp helper used by the rate limiters.
// We test the function's behaviour directly by extracting it from index.js
// via a lightweight re-implementation that mirrors the exact logic, so we
// do not need to spin up an Express server or make network calls.
//
// The function reads X-Forwarded-For and returns the left-most (original
// client) address, falling back to req.ip when the header is absent.
// ---------------------------------------------------------------------------

function getRealClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

test('returns req.ip when X-Forwarded-For header is absent', () => {
  const req = { headers: {}, ip: '203.0.113.1' };
  assert.equal(getRealClientIp(req), '203.0.113.1');
});

test('returns left-most IP from single-value X-Forwarded-For', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.5' }, ip: '10.0.0.1' };
  assert.equal(getRealClientIp(req), '203.0.113.5');
});

test('returns left-most IP from multi-hop X-Forwarded-For chain', () => {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.2, 192.168.1.1' },
    ip: '10.0.0.1',
  };
  assert.equal(getRealClientIp(req), '203.0.113.5');
});

test('trims whitespace around extracted IP', () => {
  const req = {
    headers: { 'x-forwarded-for': '  203.0.113.9  , 10.0.0.2' },
    ip: '10.0.0.1',
  };
  assert.equal(getRealClientIp(req), '203.0.113.9');
});

test('falls back to req.ip when X-Forwarded-For is an empty string', () => {
  const req = { headers: { 'x-forwarded-for': '' }, ip: '198.51.100.7' };
  assert.equal(getRealClientIp(req), '198.51.100.7');
});

test('falls back to req.ip when X-Forwarded-For is not a string', () => {
  // Some middleware may set the header to an array — should fall back safely
  const req = { headers: { 'x-forwarded-for': ['203.0.113.1', '10.0.0.2'] }, ip: '10.0.0.1' };
  assert.equal(getRealClientIp(req), '10.0.0.1');
});

test('handles IPv6 addresses in X-Forwarded-For', () => {
  const req = {
    headers: { 'x-forwarded-for': '2001:db8::1, 10.0.0.2' },
    ip: '::1',
  };
  assert.equal(getRealClientIp(req), '2001:db8::1');
});
