import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const originalWarn = console.warn;
console.warn = () => {};

const TEST_DIR = path.join(process.cwd(), 'test-reposageignore-tmp');

function cleanupDir() {
  try { fs.rmSync(TEST_DIR, { recursive: true }); } catch (_) { /* ignore */ }
}

function createIgnoreFile(contents) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, '.reposageignore'), contents);
}

function getIgnoreFilePath() {
  return path.join(TEST_DIR, '.reposageignore');
}

// ---------------------------------------------------------------------------
// Tests for parseIgnoreFile
// ---------------------------------------------------------------------------

test('parseIgnoreFile returns empty array when file does not exist', async () => {
  cleanupDir();
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, []);
});

test('parseIgnoreFile strips comment lines starting with #', async () => {
  cleanupDir();
  createIgnoreFile('# This is a comment\n*.log\n# Another comment\ndist/');
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, ['*.log', 'dist/']);
});

test('parseIgnoreFile ignores blank lines', async () => {
  cleanupDir();
  createIgnoreFile('\n\nsrc/\n\n  \n  docs/\n');
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, ['src/', 'docs/']);
});

test('parseIgnoreFile trims whitespace from each line', async () => {
  cleanupDir();
  createIgnoreFile('  *.tmp  \n  node_modules/  \n');
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, ['*.tmp', 'node_modules/']);
});

test('parseIgnoreFile returns non-comment, non-blank lines as-is', async () => {
  cleanupDir();
  createIgnoreFile('*.bak\n**/test/\nbuild/\n.git/');
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, ['*.bak', '**/test/', 'build/', '.git/']);
});

test('parseIgnoreFile treats lines starting with # as comments regardless of content', async () => {
  cleanupDir();
  createIgnoreFile('#not really a comment\nreal-entry\n# real-entry-but-comment');
  const { parseIgnoreFile } = await import('../utils/reposageIgnore.js');
  const result = parseIgnoreFile(getIgnoreFilePath());
  assert.deepEqual(result, ['real-entry']);
});

// ---------------------------------------------------------------------------
// Tests for globToRegex
// ---------------------------------------------------------------------------

test('globToRegex anchors patterns with ^ and $', async () => {
  cleanupDir();
  const { globToRegex } = await import('../utils/reposageIgnore.js');
  const regex = globToRegex('build');
  assert.ok(regex.test('build'), 'anchored pattern should match build');
  assert.ok(!regex.test('ibuild'), 'anchored pattern should not match ibuild');
  assert.ok(!regex.test('builder'), 'anchored pattern should not match builder');
});

test('globToRegex escapes dots', async () => {
  cleanupDir();
  const { globToRegex } = await import('../utils/reposageIgnore.js');
  const regex = globToRegex('*.tmp');
  assert.ok(regex.test('.tmp'), '*.tmp should match .tmp');
  assert.ok(!regex.test('filetmp'), '*.tmp should not match filetmp (escaped dot)');
  assert.ok(regex.test('debug.tmp'), '*.tmp should match debug.tmp');
});

test('globToRegex converts single * to [^/]*', async () => {
  cleanupDir();
  const { globToRegex } = await import('../utils/reposageIgnore.js');
  const regex = globToRegex('*.log');
  assert.ok(regex.test('debug.log'), '*.log should match debug.log');
  assert.ok(!regex.test('dir/debug.log'), '*.log should not match dir/debug.log (contains /)');
  assert.ok(!regex.test('debug.log.bak'), '*.log should not match debug.log.bak');
});

test('globToRegex handles ** for mid-path wildcards', async () => {
  cleanupDir();
  const { globToRegex } = await import('../utils/reposageIgnore.js');
  // src/test/** should match src/test/file.js and src/test/a/b.js
  const regex = globToRegex('src/test/**');
  assert.ok(regex.test('src/test/file.js'), 'src/test/** should match src/test/file.js');
  assert.ok(regex.test('src/test/a/b/c.js'), 'src/test/** should match src/test/a/b/c.js');
  assert.ok(!regex.test('src/other/file.js'), 'src/test/** should not match src/other/file.js');
});

test('globToRegex handles ** with a trailing segment', async () => {
  cleanupDir();
  const { globToRegex } = await import('../utils/reposageIgnore.js');
  // build/**/*.js should match build/file.js and build/src/file.js
  const regex = globToRegex('build/**/*.js');
  assert.ok(regex.test('build/file.js'), 'build/**/*.js should match build/file.js');
  assert.ok(regex.test('build/src/file.js'), 'build/**/*.js should match build/src/file.js');
  assert.ok(!regex.test('src/file.js'), 'build/**/*.js should not match src/file.js');
});

// ---------------------------------------------------------------------------
// Tests for shouldIgnore
// ---------------------------------------------------------------------------

test('shouldIgnore returns false when no ignore file exists', async () => {
  cleanupDir();
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  const result = shouldIgnore('src/index.js', TEST_DIR);
  assert.equal(result, false);
});

test('shouldIgnore matches basename patterns', async () => {
  cleanupDir();
  createIgnoreFile('*.log\n*.tmp\n');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('debug.log', TEST_DIR), true);
  assert.equal(shouldIgnore('error.log', TEST_DIR), true);
  assert.equal(shouldIgnore('file.js', TEST_DIR), false);
});

test('shouldIgnore matches ** glob patterns at root and nested', async () => {
  cleanupDir();
  createIgnoreFile('**/test/**\n**/.git/**');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('test/helper.js', TEST_DIR), true, '**/test/** should match test/helper.js');
  assert.equal(shouldIgnore('src/test/helper.js', TEST_DIR), true, '**/test/** should match src/test/helper.js');
  assert.equal(shouldIgnore('lib/test/utils/file.js', TEST_DIR), true, '**/test/** should match lib/test/utils/file.js');
  assert.equal(shouldIgnore('src/file.js', TEST_DIR), false, '**/test/** should not match src/file.js');
});

test('shouldIgnore matches **/.git/** at root and nested', async () => {
  cleanupDir();
  createIgnoreFile('**/.git/**');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('.git/config', TEST_DIR), true);
  assert.equal(shouldIgnore('src/.git/HEAD', TEST_DIR), true);
  assert.equal(shouldIgnore('src/file.js', TEST_DIR), false);
});

test('shouldIgnore matches directory-only patterns with trailing /', async () => {
  cleanupDir();
  createIgnoreFile('node_modules/\ndist/\n');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('node_modules', TEST_DIR), true);
  assert.equal(shouldIgnore('dist', TEST_DIR), true);
  assert.equal(shouldIgnore('node_modules/package/index.js', TEST_DIR), true);
  assert.equal(shouldIgnore('lib', TEST_DIR), false);
});

test('shouldIgnore does not match non-matching paths', async () => {
  cleanupDir();
  createIgnoreFile('*.log\nbuild/\n**/test/');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('file.js', TEST_DIR), false);
  assert.equal(shouldIgnore('src/index.js', TEST_DIR), false);
  assert.equal(shouldIgnore('lib', TEST_DIR), false);
});

test('shouldIgnore normalizes backslashes to forward slashes', async () => {
  cleanupDir();
  createIgnoreFile('src/\n');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('src\\index.js', TEST_DIR), true);
});

test('shouldIgnore matches basename against pattern', async () => {
  cleanupDir();
  createIgnoreFile('.DS_Store\nThumbs.db\n');
  const { shouldIgnore } = await import('../utils/reposageIgnore.js');
  assert.equal(shouldIgnore('src/.DS_Store', TEST_DIR), true);
  assert.equal(shouldIgnore('src/Thumbs.db', TEST_DIR), true);
  assert.equal(shouldIgnore('src/index.js', TEST_DIR), false);
});

console.warn = originalWarn;
