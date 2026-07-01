import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import path from 'path';
import {
  generateJSONReport,
  generateHTMLReport,
  getReportPath,
  SCHEMA_VERSION,
} from '../utils/reportGenerator.js';

test('SCHEMA_VERSION is exported as 1.0', () => {
  assert.equal(SCHEMA_VERSION, '1.0');
});

test('getReportPath returns review-report.json for json format', () => {
  const result = getReportPath('json');
  assert.ok(result.endsWith('review-report.json'));
});

test('getReportPath returns review-report.html for html format', () => {
  const result = getReportPath('html');
  assert.ok(result.endsWith('review-report.html'));
});

test('getReportPath respects custom outputDir', () => {
  const result = getReportPath('json', '/tmp/custom');
  assert.equal(result, '/tmp/custom/review-report.json');
});

test('generateJSONReport returns success:true on valid input', () => {
  const tmpDir = '/tmp/report-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const result = generateJSONReport('test-repo', ['file1.js'], {}, path.join(tmpDir, 'report.json'));
    assert.equal(result.success, true);
    assert.equal(result.path, path.join(tmpDir, 'report.json'));
    assert.ok(typeof result.findingCount === 'number');
  } finally {
    unlinkSync(path.join(tmpDir, 'report.json'));
    rmdirSync(tmpDir);
  }
});

test('generateJSONReport counts findings by severity and category', () => {
  const tmpDir = '/tmp/report-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const reviewResult = {
      fileReviews: {
        'src/app.js': {
          bugs: [{ line: 10, description: 'Unused var', rule: 'no-unused-vars' }],
          security: [{ line: 5, description: 'XSS risk', rule: 'xss' }],
          optimization: [{ line: 20, description: 'Cache this', rule: 'perf-1' }],
          styling: [{ line: 3, description: 'Missing semicolon', rule: 'style-1' }],
        },
      },
    };
    const result = generateJSONReport('test-repo', ['src/app.js'], reviewResult, path.join(tmpDir, 'report.json'));
    assert.equal(result.success, true);
    assert.equal(result.findingCount, 4);
  } finally {
    unlinkSync(path.join(tmpDir, 'report.json'));
    rmdirSync(tmpDir);
  }
});

test('generateJSONReport returns success:false when directory does not exist', () => {
  const result = generateJSONReport('test-repo', [], {}, '/nonexistent/path/report.json');
  assert.equal(result.success, false);
  assert.ok(result.error !== undefined);
});

test('generateHTMLReport returns success:true on valid input', () => {
  const tmpDir = '/tmp/report-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const result = generateHTMLReport('test-repo', ['file1.js'], {}, path.join(tmpDir, 'report.html'));
    assert.equal(result.success, true);
    assert.ok(typeof result.findingCount === 'number');
  } finally {
    unlinkSync(path.join(tmpDir, 'report.html'));
    rmdirSync(tmpDir);
  }
});

test('generateHTMLReport counts findings by severity', () => {
  const tmpDir = '/tmp/report-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const reviewResult = {
      fileReviews: {
        'src/app.js': {
          bugs: [{ line: 10, description: 'Bug', rule: 'b1' }],
          security: [{ line: 5, description: 'Sec', rule: 's1' }],
          optimization: [{ line: 20, description: 'Opt', rule: 'o1' }],
          styling: [],
        },
      },
    };
    const result = generateHTMLReport('test-repo', ['src/app.js'], reviewResult, path.join(tmpDir, 'report.html'));
    assert.equal(result.success, true);
    assert.equal(result.findingCount, 3);
  } finally {
    unlinkSync(path.join(tmpDir, 'report.html'));
    rmdirSync(tmpDir);
  }
});

test('generateHTMLReport returns success:false when directory does not exist', () => {
  const result = generateHTMLReport('test-repo', [], {}, '/nonexistent/path/report.html');
  assert.equal(result.success, false);
  assert.ok(result.error !== undefined);
});
