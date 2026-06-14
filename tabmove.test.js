const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeTabMoves } = require('./tabmove.js');

// Helper: build a window of n unpinned tabs with ids 0..n-1 at indices 0..n-1.
function win(n, pinnedCount = 0) {
  return Array.from({ length: n }, (_, i) => ({ id: i, index: i, pinned: i < pinnedCount }));
}
const pick = (all, ...indices) => indices.map(i => all[i]);

test('empty selection makes no moves', () => {
  assert.deepEqual(computeTabMoves([], win(3), 'next', true), []);
});

test('move single tab right by one', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 1), all, 'next', true), [{ id: 1, index: 2 }]);
});

test('move single tab left by one', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 2), all, 'prev', true), [{ id: 2, index: 1 }]);
});

test('right at the end wraps to the start when enabled', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 3), all, 'next', true), [{ id: 3, index: 0 }]);
});

test('right at the end does nothing when wrap disabled', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 3), all, 'next', false), []);
});

test('left at the start wraps to the end when enabled', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 0), all, 'prev', true), [{ id: 0, index: 3 }]);
});

test('left at the start does nothing when wrap disabled', () => {
  const all = win(4);
  assert.deepEqual(computeTabMoves(pick(all, 0), all, 'prev', false), []);
});

test('contiguous block moves right, rightmost first', () => {
  const all = win(5);
  assert.deepEqual(
    computeTabMoves(pick(all, 1, 2), all, 'next', true),
    [{ id: 2, index: 3 }, { id: 1, index: 2 }]
  );
});

test('contiguous block at end wraps to the start', () => {
  const all = win(5);
  assert.deepEqual(
    computeTabMoves(pick(all, 3, 4), all, 'next', true),
    [{ id: 3, index: 0 }, { id: 4, index: 1 }]
  );
});

test('mixed pinned and unpinned selection does nothing', () => {
  const all = win(4, 2); // tabs 0,1 pinned
  assert.deepEqual(computeTabMoves(pick(all, 1, 2), all, 'next', true), []);
});

test('unpinned tab cannot cross into the pinned range', () => {
  const all = win(4, 2); // pinned: 0,1 ; unpinned: 2,3
  // First unpinned tab moving left is already at its range start → wraps to end.
  assert.deepEqual(computeTabMoves(pick(all, 2), all, 'prev', true), [{ id: 2, index: 3 }]);
});

test('pinned tab wraps within the pinned range only', () => {
  const all = win(5, 2); // pinned: 0,1
  assert.deepEqual(computeTabMoves(pick(all, 1), all, 'next', true), [{ id: 1, index: 0 }]);
});

test('non-adjacent selection consolidates toward next', () => {
  const all = win(6);
  // Selecting tabs at 1 and 4, moving next → pack ending at index 4.
  assert.deepEqual(
    computeTabMoves(pick(all, 1, 4), all, 'next', true),
    [{ id: 4, index: 4 }, { id: 1, index: 3 }]
  );
});

test('non-adjacent selection consolidates toward prev', () => {
  const all = win(6);
  // Selecting tabs at 1 and 4, moving prev → pack starting at index 1.
  assert.deepEqual(
    computeTabMoves(pick(all, 1, 4), all, 'prev', true),
    [{ id: 1, index: 1 }, { id: 4, index: 2 }]
  );
});
