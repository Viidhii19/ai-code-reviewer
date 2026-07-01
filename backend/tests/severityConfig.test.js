import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadConfigFile,
  applySeverityConfig,
  filterByMinimumSeverity,
  validateConfig,
  categorizeFinding,
  DEFAULT_CONFIG,
} from '../utils/severityConfig.js';

test('categorizeFinding classifies security-related findings', () => {
  assert.equal(categorizeFinding({ message: 'SQL injection vulnerability', rule_id: 'sec-001' }), 'security');
  assert.equal(categorizeFinding({ message: 'credential exposure detected', rule_id: 'xss' }), 'security');
  assert.equal(categorizeFinding({ message: 'XSS injection risk', rule_id: 'perf-1' }), 'security');
  assert.equal(categorizeFinding({ message: '', rule_id: 'security-check' }), 'security');
});

test('categorizeFinding classifies performance-related findings', () => {
  assert.equal(categorizeFinding({ message: 'N+1 query detected', rule_id: 'style-1' }), 'performance');
  assert.equal(categorizeFinding({ message: 'Cache should be used', rule_id: 'perf-2' }), 'performance');
  assert.equal(categorizeFinding({ message: 'Query optimization needed', rule_id: 'db-1' }), 'performance');
  assert.equal(categorizeFinding({ message: '', rule_id: 'performance-n-plus-one' }), 'performance');
});

test('categorizeFinding classifies style-related findings', () => {
  assert.equal(categorizeFinding({ message: 'Formatting issue', rule_id: 'style-1' }), 'style');
  assert.equal(categorizeFinding({ message: 'Trailing comma missing', rule_id: 'fmt' }), 'style');
  assert.equal(categorizeFinding({ message: 'Style violation', rule_id: 'formatting-rule' }), 'style');
});

test('categorizeFinding returns other for unclassified findings', () => {
  assert.equal(categorizeFinding({ message: 'Some generic message', rule_id: 'unknown' }), 'other');
  assert.equal(categorizeFinding({ message: '', rule_id: '' }), 'other');
});

test('categorizeFinding is case-insensitive', () => {
  assert.equal(categorizeFinding({ message: 'CREDENTIAL exposed', rule_id: 'sec' }), 'security');
  assert.equal(categorizeFinding({ message: 'Security issue', rule_id: 'STYLE' }), 'security');
});

test('validateConfig accepts valid configs', () => {
  const result = validateConfig({
    severity: { security: 'error', performance: 'warning', style: 'info' },
    suppress: ['rule-1', 'rule-2'],
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateConfig rejects invalid severity values', () => {
  const result = validateConfig({
    severity: { security: 'critical' },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Invalid severity') && e.includes('critical')));
});

test('validateConfig rejects severity values outside enum', () => {
  const result = validateConfig({
    severity: { performance: 'urgent' },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors[0].includes('performance'));
});

test('validateConfig rejects non-array suppress field', () => {
  const result = validateConfig({ suppress: 'not-an-array' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('suppress must be an array')));
});

test('validateConfig accepts empty config', () => {
  const result = validateConfig({});
  assert.equal(result.valid, true);
});

test('validateConfig accepts config with only severity', () => {
  const result = validateConfig({ severity: { security: 'warning' } });
  assert.equal(result.valid, true);
});

test('filterByMinimumSeverity returns only findings ranked <= error when minimum is error', () => {
  const findings = [
    { severity: 'error' },
    { severity: 'warning' },
    { severity: 'info' },
  ];
  const result = filterByMinimumSeverity(findings, 'error');
  // rank: error=0, warning=1, info=2; minRank=0; keep rank <= 0 (only error)
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'error');
});

test('filterByMinimumSeverity returns findings ranked <= warning when minimum is warning', () => {
  const findings = [
    { severity: 'error' },
    { severity: 'warning' },
    { severity: 'info' },
  ];
  const result = filterByMinimumSeverity(findings, 'warning');
  // rank: error=0, warning=1, info=2; minRank=1; keep rank <= 1 (error and warning)
  assert.equal(result.length, 2);
  assert.ok(result.some(f => f.severity === 'error'));
  assert.ok(result.some(f => f.severity === 'warning'));
});

test('filterByMinimumSeverity returns all when minimum is info', () => {
  const findings = [
    { severity: 'error' },
    { severity: 'warning' },
    { severity: 'info' },
  ];
  const result = filterByMinimumSeverity(findings, 'info');
  assert.equal(result.length, 3);
});

test('filterByMinimumSeverity handles unknown severity gracefully', () => {
  // unknown severity has rank 2 (default || 2), filtered out when minRank=0
  const findings = [{ severity: 'unknown' }];
  const result = filterByMinimumSeverity(findings, 'error');
  assert.equal(result.length, 0);
});

test('filterByMinimumSeverity defaults minimumSeverity to error', () => {
  const findings = [{ severity: 'warning' }, { severity: 'error' }];
  const result = filterByMinimumSeverity(findings);
  // default minSeverity='error' -> minRank=0; only error (rank 0) passes rank <= 0
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'error');
});

test('applySeverityConfig adds category and maps severity', () => {
  const findings = [
    { rule_id: 'sec-1', severity: 'warning', message: 'injection vulnerability' },
  ];
  const config = { severity: { security: 'error', performance: 'warning', style: 'info' }, suppress: [] };
  const result = applySeverityConfig(findings, config);
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'error');
  assert.equal(result[0].category, 'security');
});

test('applySeverityConfig respects suppress list', () => {
  const findings = [
    { rule_id: 'suppressed-rule', severity: 'warning', message: 'style issue' },
    { rule_id: 'active-rule', severity: 'info', message: 'formatting' },
  ];
  const config = { severity: { security: 'error', performance: 'warning', style: 'info' }, suppress: ['suppressed-rule'] };
  const result = applySeverityConfig(findings, config);
  assert.equal(result.length, 1);
  assert.equal(result[0].rule_id, 'active-rule');
});

test('applySeverityConfig falls back to finding severity when category not in config', () => {
  const findings = [{ rule_id: 'unknown-rule', severity: 'info', message: 'generic' }];
  const config = { severity: { security: 'error' }, suppress: [] };
  const result = applySeverityConfig(findings, config);
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, 'info');
  assert.equal(result[0].category, 'other');
});

test('DEFAULT_CONFIG has correct structure', () => {
  assert.deepEqual(DEFAULT_CONFIG.severity, { security: 'error', performance: 'warning', style: 'info' });
  assert.deepEqual(DEFAULT_CONFIG.suppress, []);
});
