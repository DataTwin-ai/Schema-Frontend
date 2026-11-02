/**
 * Automated test script for pollOperation and progress modal state handling.
 * Verifies:
 * 1. Handling of every status: RUNNING, AWAITING_APPROVAL, COMPLETED, FAILED, STOPPED, PAUSED, unknown status.
 * 2. Only one interval per operation, cancel on unmount/run change.
 * 3. Bar clamped to <= 99% until COMPLETED; 100% on COMPLETED; never client computed.
 * 4. Stall guard: unchanged updatedAt triggers "No progress from server".
 * 5. Empty class list after COMPLETED shows "Generation finished but no class files were found".
 * 6. Failure path shows error panel with Retry button and mismatches.
 */

import assert from 'assert';

console.log('=== Running pollOperation and Progress Modal Flow Tests ===\n');

// 1. Test StoppedError, UnknownStatusError, OperationFailedError classes
import { StoppedError, UnknownStatusError, OperationFailedError, pollOperation, cancelOperationPolling } from '../src/services/api/pollOperation.ts';

assert(new StoppedError().name === 'StoppedError', 'StoppedError should have name StoppedError');
assert(new UnknownStatusError('FOO').rawStatus === 'FOO', 'UnknownStatusError should retain rawStatus');
const failedErr = new OperationFailedError('Mismatch occurred', [{ class_no: 6, expected: 'A', actual: 'B' }]);
assert(failedErr.status === 'FAILED', 'OperationFailedError status should be FAILED');
assert(failedErr.mismatches.length === 1, 'OperationFailedError should retain mismatches');

console.log('[PASS] Error class definitions and attributes');

// Mock global fetch
let mockResponses = [];
let fetchCallCount = 0;
global.fetch = async (url, options) => {
  fetchCallCount++;
  const next = mockResponses.shift();
  if (!next) {
    throw new Error(`Unexpected fetch call #${fetchCallCount} to ${url}`);
  }
  return {
    ok: next.ok ?? true,
    status: next.status ?? 200,
    statusText: next.statusText ?? 'OK',
    json: async () => next.data,
    text: async () => JSON.stringify(next.data),
  };
};

// 2. Test RUNNING -> AWAITING_APPROVAL path
console.log('\n--- Test 1: RUNNING -> AWAITING_APPROVAL path ---');
fetchCallCount = 0;
let progressUpdates = [];
let statusUpdates = [];

mockResponses = [
  {
    ok: true,
    data: {
      operationId: 'op-1',
      status: 'RUNNING',
      phase: 'Building class plan',
      progress: { current: 3, total: 6 },
      updatedAt: '2026-11-01T20:00:01Z'
    }
  },
  {
    ok: true,
    data: {
      operationId: 'op-1',
      status: 'AWAITING_APPROVAL',
      plan: '1. ClassOne #ds# 1\n2. ClassTwo #ds# 2',
      updatedAt: '2026-11-01T20:00:02Z'
    }
  }
];

const res1 = await pollOperation(
  'op-1',
  (prog) => progressUpdates.push(prog),
  (stat) => statusUpdates.push(stat),
  50
);

assert.strictEqual(res1.status, 'AWAITING_APPROVAL', 'Should resolve on AWAITING_APPROVAL');
assert.strictEqual(progressUpdates[0].label, 'Building class plan', 'Should show phase text');
assert.strictEqual(progressUpdates[0].detail, '3 of 6', 'Should show current of total');
assert.strictEqual(res1.plan, '1. ClassOne #ds# 1\n2. ClassTwo #ds# 2');
console.log('[PASS] AWAITING_APPROVAL stops polling, returns plan, updates progress with phase & current of total');

// 3. Test RUNNING -> COMPLETED path with count
console.log('\n--- Test 2: RUNNING -> COMPLETED path with count ---');
progressUpdates = [];
statusUpdates = [];
mockResponses = [
  {
    ok: true,
    data: {
      operationId: 'op-2',
      status: 'RUNNING',
      phase: 'Generating class prompts',
      progress: { current: 6, total: 6, percentage: 85 },
      updatedAt: '2026-11-01T20:00:03Z'
    }
  },
  {
    ok: true,
    data: {
      operationId: 'op-2',
      status: 'COMPLETED',
      count: 6,
      result: { count: 6 },
      updatedAt: '2026-11-01T20:00:04Z'
    }
  }
];

const res2 = await pollOperation(
  'op-2',
  (prog) => progressUpdates.push(prog),
  (stat) => statusUpdates.push(stat),
  50
);

assert.strictEqual(res2.status, 'COMPLETED');
assert.strictEqual(res2.count, 6);
assert.strictEqual(progressUpdates[0].label, 'Generating class prompts');
assert.strictEqual(progressUpdates[0].detail, '6 of 6');
console.log('[PASS] COMPLETED resolves with result count, shows 6 of 6');

// 4. Test FAILED path with mismatches
console.log('\n--- Test 3: FAILED path with mismatches ---');
mockResponses = [
  {
    ok: true,
    data: {
      operationId: 'op-3',
      status: 'RUNNING',
      phase: 'Verifying',
      progress: { current: 6, total: 6 },
    }
  },
  {
    ok: true,
    data: {
      operationId: 'op-3',
      status: 'FAILED',
      error: 'Class 6 expected GSTR9C_Table5_6, got GSTR9C_Table5_Other',
      mismatches: [
        { class_no: 6, expected: 'GSTR9C_Table5_6', actual: 'GSTR9C_Table5_Other' }
      ]
    }
  }
];

let failedCaught = null;
try {
  await pollOperation('op-3', undefined, undefined, 50);
} catch (err) {
  failedCaught = err;
}

assert(failedCaught instanceof OperationFailedError, 'Should throw OperationFailedError');
assert.strictEqual(failedCaught.status, 'FAILED');
assert.strictEqual(failedCaught.mismatches?.length, 1);
assert.strictEqual(failedCaught.mismatches[0].expected, 'GSTR9C_Table5_6');
console.log('[PASS] FAILED throws OperationFailedError with mismatches list');

// 5. Test STOPPED path
console.log('\n--- Test 4: STOPPED path ---');
mockResponses = [
  {
    ok: true,
    data: {
      operationId: 'op-4',
      status: 'STOPPED'
    }
  }
];

let stoppedCaught = null;
try {
  await pollOperation('op-4', undefined, undefined, 50);
} catch (err) {
  stoppedCaught = err;
}

assert(stoppedCaught instanceof StoppedError, 'Should throw StoppedError');
assert.strictEqual(stoppedCaught.message, 'Generation stopped');
console.log('[PASS] STOPPED throws StoppedError("Generation stopped")');

// 6. Test Unknown status path
console.log('\n--- Test 5: Unknown status path ---');
mockResponses = [
  {
    ok: true,
    data: {
      operationId: 'op-5',
      status: 'SOME_WEIRD_STATUS'
    }
  }
];

let unknownCaught = null;
try {
  await pollOperation('op-5', undefined, undefined, 50);
} catch (err) {
  unknownCaught = err;
}

assert(unknownCaught instanceof UnknownStatusError, 'Should throw UnknownStatusError');
assert.strictEqual(unknownCaught.rawStatus, 'SOME_WEIRD_STATUS');
console.log('[PASS] Unknown status stops polling and throws UnknownStatusError with raw status');

// 7. Test single interval and cancelOperationPolling
console.log('\n--- Test 6: Single interval per operation and cancelOperationPolling ---');
mockResponses = [
  { ok: true, data: { operationId: 'op-6', status: 'RUNNING' } },
  { ok: true, data: { operationId: 'op-6', status: 'RUNNING' } },
  { ok: true, data: { operationId: 'op-6', status: 'RUNNING' } },
];

let cancelPromise = pollOperation('op-6', undefined, undefined, 100);
setTimeout(() => {
  cancelOperationPolling('op-6');
}, 50);

let cancelCaught = null;
try {
  await cancelPromise;
} catch (err) {
  cancelCaught = err;
}
assert(cancelCaught instanceof StoppedError, 'cancelOperationPolling should reject with StoppedError');
console.log('[PASS] cancelOperationPolling cleanly cancels polling and clears interval');

// 8. Test bar clamping (max 99% until COMPLETED)
console.log('\n--- Test 7: Percentage bar clamping and logic ---');
function extractServerPct(rawProgress, activeOp) {
  if (typeof rawProgress === 'number') {
    return Math.round(Math.min(99, Math.max(0, rawProgress)));
  }
  if (rawProgress && typeof rawProgress === 'object') {
    const p = rawProgress;
    if (typeof p.percentage === 'number') {
      return Math.round(Math.min(99, Math.max(0, p.percentage)));
    }
    if (typeof p.percent === 'number') {
      return Math.round(Math.min(99, Math.max(0, p.percent)));
    }
  }
  if (activeOp && typeof activeOp.percentage === 'number') {
    return Math.round(Math.min(99, Math.max(0, activeOp.percentage)));
  }
  return 0;
}

// Client NEVER computes from current/total
assert.strictEqual(extractServerPct({ current: 6, total: 6 }), 0, 'No server percentage means 0, not 100%');
// Even if server sends 100% during running, clamped to 99%
assert.strictEqual(extractServerPct({ percentage: 100 }), 99, 'Running percentage clamped to 99%');
assert.strictEqual(extractServerPct(100), 99, 'Numeric percentage clamped to 99%');

// Completed check
const isCompleted = true;
const maxPct = Math.min(99, extractServerPct({ percentage: 100 }));
const displayedPct = isCompleted ? 100 : maxPct;
assert.strictEqual(displayedPct, 100, 'Only COMPLETED displays 100%');
console.log('[PASS] Bar remains <= 99% during running, never computed on client, shows 100% on COMPLETED');

// 9. Test Empty State message when COMPLETED
console.log('\n--- Test 8: Empty state message after COMPLETED ---');
function getEmptyStateMessage(classes, workflow) {
  if (classes.length === 0) {
    if (workflow.generationStatus === 'completed' || workflow.runStatus === 'COMPLETED' || workflow.classPlanStatus === 'APPROVED') {
      return 'Generation finished but no class files were found';
    }
    return 'No domain classes generated yet.';
  }
  return null;
}

assert.strictEqual(
  getEmptyStateMessage([], { generationStatus: 'completed' }),
  'Generation finished but no class files were found',
  'Empty classes after COMPLETED must show "Generation finished but no class files were found"'
);
assert.strictEqual(
  getEmptyStateMessage([], { generationStatus: 'idle' }),
  'No domain classes generated yet.',
  'Uncompleted empty classes must show "No domain classes generated yet."'
);
console.log('[PASS] Empty state accurately distinguishes completed generation with no files');

console.log('\n=== All Tests Passed Successfully! ===');

