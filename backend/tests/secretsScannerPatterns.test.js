import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSecrets } from '../utils/secretsScanner.js';

test('scanSecrets detects standard JWT token format', () => {
  const content = 'const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";';
  const findings = scanSecrets(content);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'JWT Token Check');
});

test('scanSecrets detects generic api keys and tokens', () => {
  const content1 = 'api_key = "abcdef1234567890"';
  const content2 = 'auth_token: "mysecretstring123"';

  assert.ok(scanSecrets(content1).length >= 1);
  assert.ok(scanSecrets(content1).some(f => f.type === 'Generic API Key / Token'));

  assert.ok(scanSecrets(content2).length >= 1);
  assert.ok(scanSecrets(content2).some(f => f.type === 'Generic API Key / Token'));
});

test('scanSecrets does not flag standard normal strings', () => {
  const content = 'This is normal code text and comments without credentials.';
  const findings = scanSecrets(content);
  assert.equal(findings.length, 0);
});

test('scanSecrets flags same secret on multiple lines with correct line numbers', () => {
  const content = [
    'const key1 = "AKIA1234567890ABCDEF";',
    'const key2 = "AKIA1234567890ABCDEF";',
    'const key3 = "AKIA1234567890ABCDEF";',
  ].join('\n');
  const findings = scanSecrets(content);
  assert.equal(findings.length, 3, 'all 3 lines should be flagged');
  assert.equal(findings[0].type, 'AWS Access Key Check');
  assert.equal(findings[0].line, 1);
  assert.equal(findings[1].line, 2);
  assert.equal(findings[2].line, 3);
});

test('scanSecrets detects multiple different secrets in same content', () => {
  const content = [
    'aws_key = "AKIA1234567890ABCDEF"',
    'github_token = "ghp_abc123xyz456789012345678901234567890"',
    'gcp_key = "AIzaSyAz12-34_567890abcdef1234567890123"',
    'db_url = "mongodb://user:pass@localhost:27017/mydb"',
  ].join('\n');
  const findings = scanSecrets(content);
  assert.ok(findings.length >= 3, 'at least 3 secrets should be detected');
  const types = findings.map(f => f.type);
  assert.ok(types.includes('AWS Access Key Check'));
  assert.ok(types.includes('GitHub Personal Access Token'));
  assert.ok(types.includes('Google Cloud API Key'));
  assert.ok(types.includes('Database Connection Credentials'));
});

test('scanSecrets returns empty array when content has no secrets', () => {
  const content = [
    'function hello() {',
    '  console.log("Hello, World!");',
    '  return 42;',
    '}',
  ].join('\n');
  const findings = scanSecrets(content);
  assert.equal(findings.length, 0);
});

test('scanSecrets findings always include suggestion and description fields', () => {
  const content = 'password = "hunter2"';
  const findings = scanSecrets(content);
  assert.ok(findings.length >= 1);
  findings.forEach(f => {
    assert.ok('suggestion' in f, 'finding must have suggestion field');
    assert.ok('description' in f, 'finding must have description field');
    assert.ok(typeof f.suggestion === 'string' && f.suggestion.length > 0);
    assert.ok(typeof f.description === 'string' && f.description.length > 0);
  });
});

test('scanSecrets detects secrets mixed with normal code across many lines', () => {
  const content = [
    '// This is a normal Python file',
    'import os',
    '',
    'AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
    '',
    'def hello():',
    '    return "world"',
    '',
    'db_url = "postgresql://user:pass123@localhost/db"',
    '',
    'if __name__ == "__main__":',
    '    print(hello())',
  ].join('\n');
  const findings = scanSecrets(content);
  assert.ok(findings.length >= 2, 'at least 2 secrets should be detected');
  const types = findings.map(f => f.type);
  assert.ok(types.includes('AWS Access Key Check'), 'AWS key should be detected');
  assert.ok(types.includes('Database Connection Credentials'), 'DB URL should be detected');
  // Verify line numbers
  const awsFinding = findings.find(f => f.type === 'AWS Access Key Check');
  const dbFinding = findings.find(f => f.type === 'Database Connection Credentials');
  assert.equal(awsFinding?.line, 4, 'AWS key on line 4');
  assert.equal(dbFinding?.line, 9, 'DB URL on line 9');
});
