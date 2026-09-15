import { BusinessInput } from '../types';

export const sampleBusinessInput: BusinessInput = {
  highLevelRequirement: 'The system should calculate supplier advance payments, track the advance balance, apply eligible advances against supplier invoices, and determine the adjusted invoice payable amount and remaining advance balance.',
  isBusinessRequirementGenerated: true,
  generatedBusinessRequirement: `DOMAIN: Accounts Payable (AP)
HLR: The system should calculate supplier advance payments, track the advance balance, apply eligible advances against supplier invoices, and determine the adjusted invoice payable amount and remaining advance balance.

Key Operational Capabilities:
1. Retrieval of contract milestones and purchase order parameters to compute eligible supplier advance payments.
2. Maintenance of a real-time sub-ledger tracking advance balances by Supplier ID and Purchase Order ID.
3. Automated matching routine and FIFO allocation logic for eligible pending supplier invoices.
4. Validation rules preventing over-allocation beyond invoice totals or remaining advance balances.
5. Immediate decrement of active advance pool balances and calculation of adjusted net payable amounts upon approval.`,
  supportingDocuments: [
    {
      id: 'doc-001',
      name: 'Supplier_Advance_Agreements_2026.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 184500,
      status: 'processed',
      uploadedAt: new Date().toISOString(),
      previewText: 'SupplierID,PO_Number,MilestoneCode,AdvancePercentage,MaxCapAmount,PaymentTerms\nSUP-4001,PO-2026-8801,M1-STARTUP,50.0,50000.00,NET30\nSUP-5102,PO-2026-9104,M1-INITIAL,50.0,60000.00,NET15'
    },
    {
      id: 'doc-002',
      name: 'AP_Invoice_Ingestion_Feed.csv',
      type: 'text/csv',
      size: 96200,
      status: 'processed',
      uploadedAt: new Date().toISOString(),
      previewText: 'InvoiceNumber,SupplierID,PO_Number,InvoiceDate,GrossAmount,Currency\nINV-PO-99201,SUP-4001,PO-2026-8801,2026-09-01,85000.00,USD\nINV-PO-99202,SUP-4001,PO-2026-8801,2026-09-03,40000.00,USD'
    }
  ],
  additionalInstructions: 'Enforce strict FIFO allocation ordering, zero-overrun validation against remaining advance pool balance, and ACID transactional concurrency.'
};
