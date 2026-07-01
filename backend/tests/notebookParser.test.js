import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import path from 'path';
import {
  stripMagicCommands,
  extractCodeCells,
  parseCellsWithMetadata,
  isNotebookFile,
  formatNotebookFindings,
} from '../utils/notebookParser.js';

test('isNotebookFile returns true for .ipynb paths', () => {
  assert.equal(isNotebookFile('notebook.ipynb'), true);
  assert.equal(isNotebookFile('path/to/notebook.ipynb'), true);
});

test('isNotebookFile returns false for non-ipynb paths', () => {
  assert.equal(isNotebookFile('script.py'), false);
  assert.equal(isNotebookFile('notebook.py'), false);
  assert.equal(isNotebookFile('notebook.ipynb.txt'), false);
  assert.equal(isNotebookFile(''), false);
});

test('stripMagicCommands removes IPython line magic commands', () => {
  const code = `%matplotlib inline
import matplotlib.pyplot as plt
%pylab
x = 1
%config IPKernelApp
print(x)
`;
  const result = stripMagicCommands(code);
  assert.equal(result.includes('%matplotlib'), false);
  assert.equal(result.includes('%pylab'), false);
  assert.equal(result.includes('%config'), false);
  assert.equal(result.includes('import matplotlib.pyplot'), true);
});

test('stripMagicCommands removes IPython cell magic commands', () => {
  const code = `%%timeit
x = sum(range(1000))
%%capture output
print("done")
%%writefile myfile.txt
content here
%%sh ls -la
`;
  const result = stripMagicCommands(code);
  assert.equal(result.includes('%%timeit'), false);
  assert.equal(result.includes('%%capture'), false);
  assert.equal(result.includes('%%writefile'), false);
  assert.equal(result.includes('%%sh'), false);
  assert.equal(result.includes('print("done")'), true);
});

test('stripMagicCommands removes shell escape prefixes', () => {
  const code = `!pip install numpy
!ls -la
git commit -m "fix"
`;
  const result = stripMagicCommands(code);
  assert.equal(result.includes('!pip'), false);
  assert.equal(result.includes('!ls'), false);
  assert.equal(result.includes('git commit'), true);
});

test('stripMagicCommands handles code with no magic commands', () => {
  const code = `import numpy as np
def hello():
    print("world")
`;
  const result = stripMagicCommands(code);
  assert.equal(result.trim(), code.trim());
});

test('stripMagicCommands handles empty string', () => {
  const result = stripMagicCommands('');
  assert.equal(result, '');
});

test('extractCodeCells returns code cells from valid notebook JSON', () => {
  const tmpDir = '/tmp/notebook-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const nbPath = path.join(tmpDir, 'test.ipynb');
    const notebook = {
      cells: [
        { cell_type: 'markdown', source: '# Title' },
        { cell_type: 'code', source: 'import numpy as np' },
        { cell_type: 'code', source: ['x = 1\n', 'y = 2'] },
        { cell_type: 'code', source: '' },
        { cell_type: 'markdown', source: '## Section' },
      ],
    };
    writeFileSync(nbPath, JSON.stringify(notebook));
    const result = extractCodeCells(nbPath);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'import numpy as np');
    assert.equal(result[1], 'x = 1\ny = 2');
  } finally {
    unlinkSync(path.join(tmpDir, 'test.ipynb'));
    rmdirSync(tmpDir);
  }
});

test('extractCodeCells returns empty array for invalid notebook (no cells)', () => {
  const tmpDir = '/tmp/notebook-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const nbPath = path.join(tmpDir, 'test.ipynb');
    writeFileSync(nbPath, JSON.stringify({}));
    const result = extractCodeCells(nbPath);
    assert.deepEqual(result, []);
  } finally {
    unlinkSync(path.join(tmpDir, 'test.ipynb'));
    rmdirSync(tmpDir);
  }
});

test('extractCodeCells handles non-array cells', () => {
  const tmpDir = '/tmp/notebook-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const nbPath = path.join(tmpDir, 'test.ipynb');
    writeFileSync(nbPath, JSON.stringify({ cells: 'not an array' }));
    const result = extractCodeCells(nbPath);
    assert.deepEqual(result, []);
  } finally {
    unlinkSync(path.join(tmpDir, 'test.ipynb'));
    rmdirSync(tmpDir);
  }
});

test('extractCodeCells handles non-existent file', () => {
  const result = extractCodeCells('/nonexistent/notebook.ipynb');
  assert.deepEqual(result, []);
});

test('parseCellsWithMetadata returns cleaned code and line counts', () => {
  const tmpDir = '/tmp/notebook-test-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  try {
    const nbPath = path.join(tmpDir, 'test.ipynb');
    const notebook = {
      cells: [
        { cell_type: 'code', source: '%matplotlib inline\nx = 1' },
        { cell_type: 'code', source: 'y = 2' },
      ],
    };
    writeFileSync(nbPath, JSON.stringify(notebook));
    const result = parseCellsWithMetadata(nbPath);
    assert.equal(result.length, 2);
    assert.equal(result[0].cellIndex, 0);
    assert.equal(result[0].originalSource.includes('%matplotlib'), true);
    assert.equal(result[0].cleanedSource.includes('%matplotlib'), false);
    assert.equal(result[1].cellIndex, 1);
    assert.equal(result[1].cleanedSource, 'y = 2');
  } finally {
    unlinkSync(path.join(tmpDir, 'test.ipynb'));
    rmdirSync(tmpDir);
  }
});

test('formatNotebookFindings adds cellContext to each finding', () => {
  const findings = [
    { rule_id: 'no-unused', message: 'Unused variable', line: 5 },
    { rule_id: 'style', message: 'Missing semicolon', line: 10 },
  ];
  const result = formatNotebookFindings(findings, 2);
  assert.equal(result.length, 2);
  assert.equal(result[0].cellContext, 'Cell 2');
  assert.equal(result[1].cellContext, 'Cell 2');
  assert.equal(result[0].rule_id, 'no-unused');
});
