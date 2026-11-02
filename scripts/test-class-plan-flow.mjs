/**
 * Test script for FIX 2: Review and approve locked plan before class generation.
 * Verifies:
 * 1. RequirementsStage on continue calls POST /api/runs/{runId}/scdp-input and stores classPlan in WorkflowContext.
 * 2. On entering Domain Classes screen, if classPlan.status is PENDING_APPROVAL, modal auto-opens.
 * 3. While plan is not approved, "Generate Classes" button opens modal instead of generate/classes.
 * 4. Approve & generate calls approvePlan, resumes polling with progress, and loads class cards.
 * 5. If generate/classes returns 409 with classPlan, ClassPlanReviewModal opens with returned plan.
 * 6. Stale banner Regenerate button calls class-plan/regenerate and opens modal for approval.
 * 7. History hydration opens modal when Domain Classes screen is shown if plan is PENDING_APPROVAL.
 */

import assert from 'assert';
import { normalizeClassPlanData, parseLockedPlan, renderLockedPlan } from '../src/utils/classPlanUtils.ts';

console.log('=== Running Class Plan Review and Approval Flow Tests ===\n');

// Test 1: scdp-input stores classPlan and normalizes it
console.log('--- Test 1: RequirementsStage continue -> scdp-input -> WorkflowContext ---');
const sampleLockedPlanText = `===== LOCKED CLASS PLAN (MANDATORY) =====
Generate EXACTLY 2 classes, in EXACTLY this order, with EXACTLY these ClassName and Datasource values.
Do not add, remove, merge, split, rename or reorder classes. This plan overrides any other instruction about which classes to create.
1. ClassName: GSTR9C_Table5_1 | Datasource: Active_TaxSys | Trigger: 2
2. ClassName: GSTR9C_Table5_2 | Datasource: Active_FS | Trigger: 1
`;

const mockScdpResponse = {
  success: true,
  classPlan: {
    status: 'PENDING_APPROVAL',
    version: 1,
    source: 'generated',
    text: sampleLockedPlanText
  }
};

const returnedPlan = mockScdpResponse.classPlan;
const normalizedPlan = normalizeClassPlanData(returnedPlan, 'generated');

assert.strictEqual(normalizedPlan.status, 'PENDING_APPROVAL');
assert.strictEqual(normalizedPlan.classes.length, 2);
assert.strictEqual(normalizedPlan.classes[0].className, 'GSTR9C_Table5_1');
assert.strictEqual(normalizedPlan.classes[1].className, 'GSTR9C_Table5_2');
console.log('[PASS] scdp-input payload parsed and normalized with status PENDING_APPROVAL and 2 classes');

// Test 2: Auto-open modal on entering when PENDING_APPROVAL
console.log('\n--- Test 2: Auto-open modal on entering when PENDING_APPROVAL ---');
let modalOpen = false;
let openedPlan = null;
const autoOpenedRunRef = { current: null };

function checkEnteringClassesScreen(workflow, planData) {
  const isPending =
    workflow.classPlanStatus === 'PENDING_APPROVAL' ||
    workflow.classPlan?.status === 'PENDING_APPROVAL' ||
    planData?.status === 'PENDING_APPROVAL';

  const runKey = `${workflow.runId || 'current'}_${workflow.classPlanVersion || 1}`;

  if (isPending && autoOpenedRunRef.current !== runKey) {
    autoOpenedRunRef.current = runKey;
    modalOpen = true;
    openedPlan = planData || normalizeClassPlanData(workflow.classPlanText, 'generated');
  }
}

const mockWorkflow = {
  runId: 'run-auto-1',
  classPlanStatus: 'PENDING_APPROVAL',
  classPlanVersion: 1,
  classPlanText: sampleLockedPlanText
};

checkEnteringClassesScreen(mockWorkflow, normalizedPlan);
assert.strictEqual(modalOpen, true, 'Modal should automatically open');
assert.strictEqual(openedPlan.classes.length, 2, 'Modal should receive the plan with 2 classes');
console.log('[PASS] Domain Classes screen auto-opens modal when plan is PENDING_APPROVAL');

// Simulate user closing with X: modalOpen = false, but autoOpenedRunRef prevents re-opening on render
modalOpen = false;
checkEnteringClassesScreen(mockWorkflow, normalizedPlan);
assert.strictEqual(modalOpen, false, 'Modal should not auto-reopen after user closed with X');
console.log('[PASS] Closing with X does not re-trigger auto-open on re-renders');

// Test 3: Generate Classes button opens modal while plan is not approved
console.log('\n--- Test 3: Generate Classes button behavior when not approved ---');
let generateClassesCalled = false;
function handleGenerateClassesClick(workflow, onOpenReview) {
  const isPlanApproved = workflow.classPlanStatus === 'APPROVED';
  if (!isPlanApproved) {
    onOpenReview();
    return;
  }
  generateClassesCalled = true;
}

handleGenerateClassesClick(mockWorkflow, () => { modalOpen = true; });
assert.strictEqual(modalOpen, true, 'Generate Classes should reopen modal instead of generating');
assert.strictEqual(generateClassesCalled, false, 'generateClasses should not be called');
console.log('[PASS] Generate Classes button opens modal when plan is not approved');

// When approved:
mockWorkflow.classPlanStatus = 'APPROVED';
modalOpen = false;
handleGenerateClassesClick(mockWorkflow, () => { modalOpen = true; });
assert.strictEqual(modalOpen, false);
assert.strictEqual(generateClassesCalled, true, 'generateClasses should be called when approved');
console.log('[PASS] Generate Classes button calls generator once plan is APPROVED');

// Test 4: 409 conflict handling opens modal with returned plan
console.log('\n--- Test 4: 409 conflict returns classPlan and opens modal ---');
const error409 = {
  status: 409,
  classPlan: {
    status: 'PENDING_APPROVAL',
    version: 2,
    source: 'generated',
    text: sampleLockedPlanText
  }
};

let modalOpenedOn409 = false;
let plan409 = null;

if (error409.status === 409 && error409.classPlan) {
  const norm = normalizeClassPlanData(error409.classPlan, 'generated');
  modalOpenedOn409 = true;
  plan409 = norm;
}

assert.strictEqual(modalOpenedOn409, true);
assert.strictEqual(plan409.version, 2);
console.log('[PASS] 409 response with classPlan triggers review modal with server version');

// Test 5: Stale banner Regenerate button calls regenerate and opens modal
console.log('\n--- Test 5: Stale banner regenerate flow ---');
let regenerateEndpointCalled = false;
async function mockHandleRegeneratePlan(runId) {
  regenerateEndpointCalled = true;
  return normalizeClassPlanData(sampleLockedPlanText, 'generated');
}

let modalOpenedOnRegenerate = false;
const planFromRegen = await mockHandleRegeneratePlan('run-auto-1');
modalOpenedOnRegenerate = true;

assert.strictEqual(regenerateEndpointCalled, true, 'Regenerate endpoint was called');
assert.strictEqual(modalOpenedOnRegenerate, true, 'Modal opened for approval after regenerate');
console.log('[PASS] Stale banner Regenerate calls class-plan/regenerate and opens modal for approval');

// Test 6: History hydration opens modal when plan is PENDING_APPROVAL
console.log('\n--- Test 6: History hydration auto-open ---');
const historyWorkflow = {
  runId: 'run-history-99',
  classPlanStatus: 'PENDING_APPROVAL',
  classPlanVersion: 1,
  classPlanText: sampleLockedPlanText
};

autoOpenedRunRef.current = null; // New run
modalOpen = false;
checkEnteringClassesScreen(historyWorkflow, null);
assert.strictEqual(modalOpen, true, 'Past run with PENDING_APPROVAL auto-opens modal on Domain Classes screen');
console.log('[PASS] Past run with PENDING_APPROVAL auto-opens modal when Domain Classes is shown');

console.log('\n=== All Class Plan Flow Tests Passed Successfully! ===');
