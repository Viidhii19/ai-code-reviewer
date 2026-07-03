import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { stripMagicCommands, extractCodeCells, parseCellsWithMetadata, isNotebookFile, formatNotebookFindings } from '../utils/notebookParser.js';

const FIXTURE_DIR = '/tmp/np-fixtures-' + Date.now();
fs.mkdirSync(FIXTURE_DIR, { recursive: true });

test('stripMagicCommands removes %matplotlib magic', () => {
  const result = stripMagicCommands('%matplotlib inline\nprint("hello")');
  assert.equal(result, 'print("hello")');
});

test('stripMagicCommands removes %pylab magic', () => {
  const result = stripMagicCommands('%pylab inline\nx = 1');
  assert.equal(result, 'x = 1');
});

test('stripMagicCommands removes %config magic', () => {
  const result = stripMagicCommands('%config InlineBackend.figure_format = "retina"');
  assert.equal(result, '');
});

test('stripMagicCommands removes %%time cell magic', () => {
  const result = stripMagicCommands('%%time\nsleep(0.1)');
  assert.equal(result, 'sleep(0.1)');
});

test('stripMagicCommands removes %%timeit cell magic', () => {
  const result = stripMagicCommands('%%timeit -n 3\nsum(range(100))');
  assert.equal(result, 'sum(range(100))');
});

test('stripMagicCommands removes %%capture cell magic', () => {
  const result = stripMagicCommands('%%capture output\nprint("hidden")');
  assert.equal(result, 'print("hidden")');
});

test('stripMagicCommands removes %%writefile cell magic', () => {
  const result = stripMagicCommands('%%writefile hello.txt\nhello world');
  assert.equal(result, 'hello world');
});

test('stripMagicCommands removes %%sh cell magic', () => {
  const result = stripMagicCommands('%%sh\necho hello');
  assert.equal(result, 'echo hello');
});

test('stripMagicCommands removes %%bash cell magic', () => {
  const result = stripMagicCommands('%%bash\nls -la');
  assert.equal(result, 'ls -la');
});

test('stripMagicCommands removes ! shell commands', () => {
  const result = stripMagicCommands('!pip install numpy\nx = 1');
  assert.equal(result, 'x = 1');
});

test('stripMagicCommands removes shell-style ! at start of line', () => {
  const result = stripMagicCommands('!ls /tmp\nimport os');
  assert.equal(result, 'import os');
});

test('stripMagicCommands handles code with no magic commands', () => {
  const code = 'def hello():\n    print("world")';
  assert.equal(stripMagicCommands(code), code);
});

test('stripMagicCommands removes blank lines left by magic removal', () => {
  const result = stripMagicCommands('%matplotlib inline\n\n\nprint("hello")\n\n');
  assert.equal(result, 'print("hello")');
});

test('stripMagicCommands preserves indentation in remaining code', () => {
  const code = 'def outer():\n    %matplotlib inline\n    x = 1\n    return x';
  const result = stripMagicCommands(code);
  assert.ok(result.includes('    x = 1'));
  assert.ok(result.includes('    return x'));
});

test('stripMagicCommands handles empty input', () => {
  assert.equal(stripMagicCommands(''), '');
  assert.equal(stripMagicCommands('   '), '');
});

test('extractCodeCells extracts code cells from valid notebook', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'test.ipynb');
  const notebook = {
    cells: [
      { cell_type: 'markdown', source: '# Title' },
      { cell_type: 'code', source: 'x = 1' },
      { cell_type: 'code', source: ['y = 2\n', 'z = 3'] },
    ],
  };
  fs.writeFileSync(nbPath, JSON.stringify(notebook));
  const cells = extractCodeCells(nbPath);
  assert.equal(cells.length, 2);
  assert.equal(cells[0], 'x = 1');
  assert.equal(cells[1], 'y = 2\nz = 3');
});

test('extractCodeCells returns empty array for markdown-only notebook', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'mdonly.ipynb');
  const notebook = { cells: [{ cell_type: 'markdown', source: '# Title' }] };
  fs.writeFileSync(nbPath, JSON.stringify(notebook));
  assert.deepEqual(extractCodeCells(nbPath), []);
});

test('extractCodeCells skips empty code cells', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'empty.ipynb');
  const notebook = { cells: [{ cell_type: 'code', source: '   ' }] };
  fs.writeFileSync(nbPath, JSON.stringify(notebook));
  assert.deepEqual(extractCodeCells(nbPath), []);
});

test('extractCodeCells handles array source in cells', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'array.ipynb');
  const notebook = { cells: [{ cell_type: 'code', source: ['line1\n', 'line2'] }] };
  fs.writeFileSync(nbPath, JSON.stringify(notebook));
  const cells = extractCodeCells(nbPath);
  assert.equal(cells.length, 1);
  assert.equal(cells[0], 'line1\nline2');
});

test('extractCodeCells returns empty array for invalid JSON', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'bad.ipynb');
  fs.writeFileSync(nbPath, 'not valid json');
  assert.deepEqual(extractCodeCells(nbPath), []);
});

test('extractCodeCells returns empty array for missing cells array', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'nocells.ipynb');
  fs.writeFileSync(nbPath, JSON.stringify({}));
  assert.deepEqual(extractCodeCells(nbPath), []);
});

test('isNotebookFile returns true for .ipynb files', () => {
  assert.equal(isNotebookFile('notebook.ipynb'), true);
  assert.equal(isNotebookFile('path/to/file.ipynb'), true);
});

test('isNotebookFile returns false for non-notebook files', () => {
  assert.equal(isNotebookFile('script.py'), false);
  assert.equal(isNotebookFile('data.json'), false);
  assert.equal(isNotebookFile('notebook.py'), false);
});

test('parseCellsWithMetadata returns cells with metadata', async () => {
  const nbPath = path.join(FIXTURE_DIR, 'meta.ipynb');
  const notebook = {
    cells: [
      { cell_type: 'code', source: '%%time\nx = 1' },
      { cell_type: 'markdown', source: '# Title' },
    ],
  };
  fs.writeFileSync(nbPath, JSON.stringify(notebook));
  const cells = parseCellsWithMetadata(nbPath);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].cellIndex, 0);
  assert.equal(cells[0].cleanedSource, 'x = 1');
  assert.ok(cells[0].originalSource.includes('%%time'));
});

test('formatNotebookFindings adds cell context', () => {
  const findings = [{ line: 10, rule: 'unused-var', message: 'unused x' }];
  const result = formatNotebookFindings(findings, 2);
  assert.equal(result.length, 1);
  assert.equal(result[0].cellContext, 'Cell 2');
  assert.equal(result[0].line, 10);
});
