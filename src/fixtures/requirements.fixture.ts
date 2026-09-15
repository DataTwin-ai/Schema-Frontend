import { RequirementsModel } from '../types';

export const sampleRequirements: RequirementsModel = {
  domain: 'Accounts Payable (AP)',
  highLevelRequirement:
    'The system should calculate supplier advance payments, track the advance balance, apply eligible advances against supplier invoices, and determine the adjusted invoice payable amount and remaining advance balance.',
  generatedAt: new Date().toISOString(),
  problemStatements: [
    {
      id: 'ps-1',
      code: 'PS-001',
      title: 'Supplier Advance Calculation & Milestone Alignment',
      category: 'Calculation',
      description:
        'Determining the correct supplier advance payment amount in accordance with contract milestones or purchase order terms to avoid overpayment.',
      isAiGenerated: true,
    },
    {
      id: 'ps-2',
      code: 'PS-002',
      title: 'Real-Time Advance Balance Tracking',
      category: 'Workflow',
      description:
        'Maintaining an accurate, real-time record of remaining advance balances per supplier to prevent loss of financial visibility on prepaid assets.',
      isAiGenerated: true,
    },
    {
      id: 'ps-3',
      code: 'PS-003',
      title: 'Invoice Advance Matching & Allocation',
      category: 'Allocation',
      description:
        'Matching and allocating eligible outstanding advances against incoming supplier invoices based on predefined business rules.',
      isAiGenerated: true,
    },
    {
      id: 'ps-4',
      code: 'PS-004',
      title: 'Allocation Cap & Balance Validation',
      category: 'Validation',
      description:
        'Ensuring the applied advance payment does not exceed the total invoice amount or the remaining eligible advance balance.',
      isAiGenerated: true,
    },
    {
      id: 'ps-5',
      code: 'PS-005',
      title: 'Net Payable Computation & Pool Update',
      category: 'Calculation',
      description:
        'Calculating the final net payable amount for the invoice after deductions and accurately updating the remaining advance pool.',
      isAiGenerated: true,
    },
    {
      id: 'ps-6',
      code: 'PS-006',
      title: 'Multi-Invoice Settlement Priority',
      category: 'Decision',
      description:
        'Deciding the order of application when multiple pending invoices are eligible to be settled by a single remaining advance balance.',
      isAiGenerated: true,
    },
  ],
  businessObjectives: [
    {
      id: 'bo-1',
      code: 'BO-001',
      title: 'Automated Advance Calculation',
      derivedFromPsCode: 'PS-001',
      description:
        'Establish automated, precise computation of supplier advance payments aligned with purchase order terms and contract milestones to eliminate manual calculation errors and overpayments.',
      isAiGenerated: true,
    },
    {
      id: 'bo-2',
      code: 'BO-002',
      title: 'Sub-Ledger Advance Visibility',
      derivedFromPsCode: 'PS-002',
      description:
        'Maintain a real-time, sub-ledger level visibility of outstanding prepaid assets and remaining advance balances per supplier.',
      isAiGenerated: true,
    },
    {
      id: 'bo-3',
      code: 'BO-003',
      title: 'Standardized Matching & Prioritization',
      derivedFromPsCode: 'PS-003, PS-006',
      description:
        'Standardize and automate the prioritization, matching, and allocation of eligible outstanding advances against incoming supplier invoices based on structured business logic.',
      isAiGenerated: true,
    },
    {
      id: 'bo-4',
      code: 'BO-004',
      title: 'Financial Allocation Controls',
      derivedFromPsCode: 'PS-004, PS-005',
      description:
        'Enforce strict financial controls to prevent over-allocation of prepayments beyond invoice totals or available balances, ensuring accurate calculation of final net payables.',
      isAiGenerated: true,
    },
  ],
  businessRequirements: [
    {
      id: 'br-1',
      code: 'BR-001',
      title: 'Contract Milestone & PO Term Retrieval',
      category: 'Lookup',
      derivedFromBoCode: 'BO-001',
      description:
        'The system shall retrieve the contract milestone parameters or purchase order terms to calculate the eligible supplier advance payment amount.',
      isAiGenerated: true,
    },
    {
      id: 'br-2',
      code: 'BR-002',
      title: 'Real-Time Advance Balance Ledger',
      category: 'Workflow',
      derivedFromBoCode: 'BO-002',
      description:
        'The system shall update and maintain a real-time ledger of outstanding advance balances aggregated by supplier ID and purchase order ID.',
      isAiGenerated: true,
    },
    {
      id: 'br-3',
      code: 'BR-003',
      title: 'Automated Invoice Matching Algorithm',
      category: 'Lookup',
      derivedFromBoCode: 'BO-003',
      description:
        'The system shall execute a matching algorithm to identify eligible outstanding advances for any newly entered supplier invoice based on matching Supplier ID and Purchase Order ID.',
      isAiGenerated: true,
    },
    {
      id: 'br-4',
      code: 'BR-004',
      title: 'FIFO Advance Allocation Ordering',
      category: 'Decision',
      derivedFromBoCode: 'BO-003',
      description:
        'The system shall apply a First-In, First-Out (FIFO) rule to determine the allocation order of remaining advance balances when multiple eligible invoices are pending against a single advance pool.',
      isAiGenerated: true,
    },
    {
      id: 'br-5',
      code: 'BR-005',
      title: 'Allocation Limit & Invoice Cap Validation',
      category: 'Validation',
      derivedFromBoCode: 'BO-004',
      description:
        'The system shall validate that the proposed advance payment allocation is less than or equal to the remaining eligible advance balance and does not exceed the gross invoice amount.',
      isAiGenerated: true,
    },
    {
      id: 'br-6',
      code: 'BR-006',
      title: 'Net Payable Amount Calculation',
      category: 'Calculation',
      derivedFromBoCode: 'BO-004',
      description:
        'The system shall calculate the adjusted net payable amount for the invoice by subtracting the allocated advance amount from the gross invoice amount.',
      isAiGenerated: true,
    },
    {
      id: 'br-7',
      code: 'BR-007',
      title: 'Active Advance Pool Balance Decrement',
      category: 'Allocation',
      derivedFromBoCode: 'BO-002, BO-004',
      description:
        'The system shall deduct the applied invoice allocation amount from the supplier\'s active advance pool balance immediately upon invoice approval.',
      isAiGenerated: true,
    },
  ],
  financeRequirements: [
    {
      id: 'fr-1',
      code: 'FR-001',
      title: 'Procurement Parameter Ingestion & Advance Calculation',
      derivedFromBrCode: 'BR-001',
      description:
        'The system must ingest contract milestones and purchase order parameters from the ERP procurement module to automatically calculate the maximum eligible supplier advance payment amount.',
      isAiGenerated: true,
    },
    {
      id: 'fr-2',
      code: 'FR-002',
      title: 'Advance Paid & Remaining Balance Sub-Ledger',
      derivedFromBrCode: 'BR-002',
      description:
        'The system must maintain a real-time ledger recording the total advance paid, amount applied, and remaining balance for each unique combination of Supplier ID and Purchase Order ID.',
      isAiGenerated: true,
    },
    {
      id: 'fr-3',
      code: 'FR-003',
      title: 'Automated Supplier & PO Matching Routine',
      derivedFromBrCode: 'BR-003',
      description:
        'The system must execute an automated matching routine that identifies outstanding advance payments matching the Supplier ID and Purchase Order ID of newly registered supplier invoices.',
      isAiGenerated: true,
    },
    {
      id: 'fr-4',
      code: 'FR-004',
      title: 'Chronological FIFO Invoice Settlement Logic',
      derivedFromBrCode: 'BR-004',
      description:
        'The system must apply a FIFO (First-In, First-Out) allocation logic to allocate available advance balances to eligible pending invoices based on the chronological invoice creation date.',
      isAiGenerated: true,
    },
    {
      id: 'fr-5',
      code: 'FR-005',
      title: 'Over-Allocation Blocking Validation Rule',
      derivedFromBrCode: 'BR-005',
      description:
        'The system must execute a validation rule that blocks advance allocations if the proposed allocation amount exceeds either the remaining advance pool balance or the gross invoice amount.',
      isAiGenerated: true,
    },
    {
      id: 'fr-6',
      code: 'FR-006',
      title: 'Adjusted Net Payable Amount Display',
      derivedFromBrCode: 'BR-006',
      description:
        'The system must calculate and display the adjusted net payable amount for the supplier invoice by subtracting the verified allocated advance amount from the gross invoice amount.',
      isAiGenerated: true,
    },
    {
      id: 'fr-7',
      code: 'FR-007',
      title: 'Post-Approval Advance Pool Balance Update',
      derivedFromBrCode: 'BR-007',
      description:
        'The system must instantly update and decrement the supplier\'s active advance pool balance upon the formal approval of the matching invoice.',
      isAiGenerated: true,
    },
  ],
  technicalRequirements: [
    {
      id: 'tr-1',
      code: 'TR-001',
      title: 'RESTful ERP Procurement Integration APIs',
      derivedFromFrCodes: ['FR-001'],
      description:
        'The system must expose secure RESTful APIs with JSON payloads to integrate with third-party ERP procurement modules for real-time contract and PO retrieval.',
      isAiGenerated: true,
    },
    {
      id: 'tr-2',
      code: 'TR-002',
      title: 'ACID Transactional Concurrency Controls',
      derivedFromFrCodes: ['FR-002', 'FR-007'],
      description:
        'The sub-ledger database must enforce ACID-compliant transactional controls to prevent race conditions during concurrent updates of the supplier advance pool balances.',
      isAiGenerated: true,
    },
    {
      id: 'tr-3',
      code: 'TR-003',
      title: 'Database Indexing for Low-Latency FIFO Matching',
      derivedFromFrCodes: ['FR-003', 'FR-004'],
      description:
        'The database schema must index Supplier ID, Purchase Order ID, and Invoice Date/Time fields to optimize FIFO matching query response times to under 500ms.',
      isAiGenerated: true,
    },
    {
      id: 'tr-4',
      code: 'TR-004',
      title: 'Stateless Business Rules Engine for Allocations',
      derivedFromFrCodes: ['FR-005', 'FR-006'],
      description:
        'The business rules engine must support a configurable stateless execution framework to evaluate allocation limits and validations before committing invoices to the database.',
      isAiGenerated: true,
    },
  ],
  expectedOutput: {
    title: 'Supplier Advance Allocation & Net Payable Schedule',
    type: 'Settlement Transactions',
    description:
      'Calculated supplier advance deductions against matched incoming purchase order invoices, detailing eligible advance pools, applied FIFO deductions, verified net payable balances, and remaining sub-ledger advance assets.',
    sampleRecords: [
      {
        recordId: 'TXN-ADV-2026-001',
        sourceBillId: 'INV-PO-99201',
        vendorName: 'Apex Industrial Supplies (SUP-4001)',
        prepaidGlAccount: '141000 - Supplier Advance Asset',
        originalBillTotal: 85000.0,
        allocationDetails: [
          {
            targetLob: 'PO-2026-8801',
            allocationPercentage: 100.0,
            baseAllocatedAmount: 50000.0,
            destinationTaxProfile: 'ADV-DEDUCTION-STD',
            appliedTaxRate: 0.0,
            calculatedTaxAmount: 0.0,
            allocatedTotalWithTax: 50000.0,
          },
        ],
        postAllocationAdjustments: [
          {
            adjustmentId: 'ADJ-ADV-001',
            targetLob: 'PO-2026-8801',
            adjustmentAmount: 0.0,
            reason: 'Full milestone 1 advance applied to early invoice',
          },
        ],
        approvalWorkflow: {
          currentStep: 'APPROVED',
          assignedApprover: 'ap.controller@enterprise.com',
          approvalDate: '2026-09-08T11:00:00Z',
          workflowStatus: 'APPROVED',
        },
        reconciliationSummary: {
          totalAllocatedBase: 50000.0,
          netAdjustments: 0.0,
          reconciliationVariance: 0.0,
        },
        status: 'PROCESSED',
      },
      {
        recordId: 'TXN-ADV-2026-002',
        sourceBillId: 'INV-PO-99202',
        vendorName: 'Apex Industrial Supplies (SUP-4001)',
        prepaidGlAccount: '141000 - Supplier Advance Asset',
        originalBillTotal: 40000.0,
        allocationDetails: [
          {
            targetLob: 'PO-2026-8801',
            allocationPercentage: 100.0,
            baseAllocatedAmount: 25000.0,
            destinationTaxProfile: 'ADV-DEDUCTION-STD',
            appliedTaxRate: 0.0,
            calculatedTaxAmount: 0.0,
            allocatedTotalWithTax: 25000.0,
          },
        ],
        postAllocationAdjustments: [],
        approvalWorkflow: {
          currentStep: 'APPROVED',
          assignedApprover: 'ap.controller@enterprise.com',
          approvalDate: '2026-09-09T09:30:00Z',
          workflowStatus: 'APPROVED',
        },
        reconciliationSummary: {
          totalAllocatedBase: 25000.0,
          netAdjustments: 0.0,
          reconciliationVariance: 0.0,
        },
        status: 'PROCESSED',
      },
      {
        recordId: 'TXN-ADV-2026-003',
        sourceBillId: 'INV-PO-77410',
        vendorName: 'Global Precision Tooling (SUP-5102)',
        prepaidGlAccount: '141000 - Supplier Advance Asset',
        originalBillTotal: 120000.0,
        allocationDetails: [
          {
            targetLob: 'PO-2026-9104',
            allocationPercentage: 100.0,
            baseAllocatedAmount: 60000.0,
            destinationTaxProfile: 'ADV-DEDUCTION-STD',
            appliedTaxRate: 0.0,
            calculatedTaxAmount: 0.0,
            allocatedTotalWithTax: 60000.0,
          },
        ],
        postAllocationAdjustments: [],
        approvalWorkflow: {
          currentStep: 'PENDING_APPROVAL',
          assignedApprover: 'finance.lead@enterprise.com',
          approvalDate: null,
          workflowStatus: 'PENDING',
        },
        reconciliationSummary: {
          totalAllocatedBase: 60000.0,
          netAdjustments: 0.0,
          reconciliationVariance: 0.0,
        },
        status: 'PENDING',
      },
    ],
  },
};
