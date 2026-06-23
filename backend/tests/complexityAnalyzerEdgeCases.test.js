import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeComplexity } from '../utils/complexityAnalyzer.js';

test('analyzeComplexity handles null/undefined content gracefully', () => {
  const result = analyzeComplexity(null, 'index.js');
  assert.equal(result.totalLines, 0);
  assert.equal(result.emptyLines, 0);
  assert.equal(result.codeLines, 0);
  assert.equal(result.complexityScore, 0);
  assert.equal(result.grade, 'A');
});

test('analyzeComplexity handles non-string content', () => {
  const result = analyzeComplexity(123, 'index.js');
  assert.equal(result.totalLines, 0);
  assert.equal(result.grade, 'A');
});

test('analyzeComplexity counts multi-line C-style block comments in JS', () => {
  const code = [
    '/*',
    ' * This is a multi-line',
    ' * block comment',
    ' */',
    'const x = 1;',
  ].join('\n');
  const result = analyzeComplexity(code, 'index.js');
  // analyzer counts: /*, *, *, */ = 4 comment lines; const x = 1; = 1 code line
  assert.equal(result.commentLines, 4);
  assert.equal(result.codeLines, 1);
  assert.equal(result.totalLines, 5);
});

test('analyzeComplexity detects opening HTML comment line', () => {
  const code = [
    '<!-- HTML comment start',
    '  Multi-line content inside',
    '  HTML comment end -->',
    '<div>Hello</div>',
  ].join('\n');
  const result = analyzeComplexity(code, 'page.html');
  // analyzer only flags lines starting with <!-- as comment
  assert.equal(result.commentLines, 1);
  assert.equal(result.codeLines, 3);
});

test('analyzeComplexity detects Go functions', () => {
  const code = [
    'package main',
    '',
    'func main() {',
    '  fmt.Println("hello")',
    '}',
    '',
    'func helper() string {',
    '  return "world"',
    '}',
  ].join('\n');
  const result = analyzeComplexity(code, 'main.go');
  assert.equal(result.functionCount, 2);
  assert.equal(result.codeLines >= 2, true);
});

test('analyzeComplexity detects Java methods', () => {
  const code = [
    'public class Main {',
    '  public void run() {',
    '    System.out.println("hi");',
    '  }',
    '  private int compute() {',
    '    return 42;',
    '  }',
    '}',
  ].join('\n');
  const result = analyzeComplexity(code, 'Main.java');
  assert.equal(result.functionCount, 2);
});

test('analyzeComplexity detects C++ methods', () => {
  const code = [
    'class Foo {',
    'public:',
    '  void bar() { }',
    '  int baz() { return 0; }',
    '};',
  ].join('\n');
  const result = analyzeComplexity(code, 'foo.cpp');
  assert.equal(result.functionCount, 2);
});

test('analyzeComplexity detects SQL comments', () => {
  const code = [
    '-- single line SQL comment',
    'SELECT id, name FROM users;',
    '/* block',
    '   SQL comment */',
    'SELECT * FROM orders;',
  ].join('\n');
  const result = analyzeComplexity(code, 'query.sql');
  // -- comment + /* block + SQL comment */ = 3 comment lines
  assert.equal(result.commentLines, 3);
  assert.equal(result.codeLines, 2);
});

test('analyzeComplexity computes complexity score and grade correctly', () => {
  // Formula: complexityScore = round((totalLines / 25) + (functionCount * 3))
  // 10 lines / 25 = 0.4, 3 functions * 3 = 9, score = round(9.4) = 9
  // score 9 is between 8 and 15 -> grade B
  const code = [
    'def foo(): pass',
    'def bar(): pass',
    'def baz(): pass',
    'x = 1',
    'y = 2',
    'z = 3',
    'a = 4',
    'b = 5',
    'c = 6',
    'd = 7',
  ].join('\n');
  const result = analyzeComplexity(code, 'app.py');
  assert.equal(result.functionCount, 3);
  assert.equal(result.totalLines, 10);
  assert.equal(result.complexityScore, 9);
  assert.equal(result.grade, 'B');
});

test('analyzeComplexity grade thresholds', () => {
  const resultA = analyzeComplexity('x = 1\n'.repeat(5), 'a.py');
  assert.equal(resultA.grade, 'A'); // score ~1, under 8

  const resultF = analyzeComplexity('def f(): pass\n'.repeat(20), 'b.py');
  assert.equal(resultF.grade, 'F'); // score > 40
});