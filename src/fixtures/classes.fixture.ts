import { SchemaClass } from '../types';

export const sampleSchemaClasses: SchemaClass[] = [
  {
    id: 'class-01',
    classNumber: 1,
    className: 'PO_ItemCalculation',
    purpose: 'Ingest Purchase Order item data and compute line valuations including base values, taxes, and document totals.',
    datasource: 'PO_I',
    grain: 'Per Item',
    classLevelFields: [
      'DocumentNumber',
      'ItemID',
      'ItemName',
      'CostAllocationMethod',
      'TaxCode',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [],
    formulaRules: [
      'BaseValue = (Qty * Rate)',
      'TaxableBase = BaseValue - Discount + AddlCharge',
      'TaxValue = TaxableBase * (TaxPercentage / 100)',
      'DocumentValue = TaxableBase + TaxValue'
    ],
    components: [
      {
        id: 'comp-01-1',
        name: 'Qty',
        type: 'Source',
        expression: 'Qty',
        description: 'Source quantity'
      },
      {
        id: 'comp-01-2',
        name: 'Rate',
        type: 'Source',
        expression: 'Rate',
        description: 'Source rate'
      },
      {
        id: 'comp-01-3',
        name: 'Discount',
        type: 'Source',
        expression: 'Discount',
        description: 'Source discount'
      },
      {
        id: 'comp-01-4',
        name: 'AddlCharge',
        type: 'Source',
        expression: 'AddlCharge',
        description: 'Source additional charges'
      },
      {
        id: 'comp-01-5',
        name: 'TaxPercentage',
        type: 'Source',
        expression: 'TaxPercentage',
        description: 'Source tax percentage'
      },
      {
        id: 'comp-01-6',
        name: 'BaseValue',
        type: 'MATH',
        expression: '(Qty * Rate)',
        description: 'Base value computation'
      },
      {
        id: 'comp-01-7',
        name: 'TaxableBase',
        type: 'MATH',
        expression: 'BaseValue - Discount + AddlCharge',
        description: 'Taxable base calculation'
      },
      {
        id: 'comp-01-8',
        name: 'TaxValue',
        type: 'MATH',
        expression: 'TaxableBase * (TaxPercentage / 100)',
        description: 'Tax value calculation'
      },
      {
        id: 'comp-01-9',
        name: 'DocumentValue',
        type: 'MATH',
        expression: 'TaxableBase + TaxValue',
        description: 'Document total value'
      }
    ],
    criteria: [
      'DocumentNumber (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Computed PO line amounts in transactional currency with completion code TT.',
    dependencies: ['NA'],
    exposes: [
      'BaseValue: fetched by Class5 POCostAllocation',
      'DocumentValue: fetched by Class5 POCostAllocation, summed by Class7 POWF'
    ],
    reviewPoints: 'None',
    associatedRequirements: ['BR-001', 'FR-001', 'TR-001'],
    rawText: `ClassNumber: 1
ClassName: PO_ItemCalculation
Purpose: Ingest Purchase Order item data and compute line valuations including base values, taxes, and document totals.
Datasource: PO_I
Grain: Per Item
Class-level fields: DocumentNumber, ItemID, ItemName, CostAllocationMethod, TaxCode, ForPrdFrom, ForPrdTo
Lookup rules: NA
Formula rules: BaseValue = (Qty * Rate), TaxableBase = BaseValue - Discount + AddlCharge, TaxValue = TaxableBase * (TaxPercentage / 100), DocumentValue = TaxableBase + TaxValue
Components required: Qty (Source), Rate (Source), Discount (Source), AddlCharge (Source), TaxPercentage (Source), BaseValue (MATH), TaxableBase (MATH), TaxValue (MATH), DocumentValue (MATH)
Criteria required: DocumentNumber (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Computed PO line amounts in transactional currency with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: NA
# ------------------------------------------------------------

EXPOSES:
- BaseValue: fetched by Class5 POCostAllocation
- DocumentValue: fetched by Class5 POCostAllocation, summed by Class7 POWF

REVIEW points:
- Ensure all line item valuations validate against active rate matrices.`
  },
  {
    id: 'class-02',
    classNumber: 2,
    className: 'CostAllocationMaster',
    purpose: 'Serve as the master data dictionary for Line of Business (LOB) cost allocation parameters.',
    datasource: 'CA',
    grain: 'Master Lookup',
    classLevelFields: [
      'CostAllocationMethod',
      'LOB',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [],
    formulaRules: [],
    components: [
      {
        id: 'comp-02-1',
        name: 'CostAllocationValue',
        type: 'MATH',
        expression: 'CostAllocationValue',
        description: 'MATH pass-through'
      }
    ],
    criteria: [
      'CostAllocationMethod (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Resolution of LOB text mappings and allocation percentages with completion code TT.',
    dependencies: ['NA'],
    exposes: [
      'CostAllocationValue: fetched by Class3 POCostAllocation1'
    ],
    reviewPoints: 'None',
    associatedRequirements: ['BR-002', 'FR-002', 'TR-002'],
    rawText: `ClassNumber: 2
ClassName: CostAllocationMaster
Purpose: Serve as the master data dictionary for Line of Business (LOB) cost allocation parameters.
Datasource: CA
Grain: Master Lookup
Class-level fields: CostAllocationMethod, LOB, ForPrdFrom, ForPrdTo
Lookup rules: NA
Formula rules: Pass-through mathematical components for exposed numeric fields.
Components required: CostAllocationValue (MATH)
Criteria required: CostAllocationMethod (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Resolution of LOB text mappings and allocation percentages with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: NA
# ------------------------------------------------------------

EXPOSES:
- CostAllocationValue: fetched by Class3 POCostAllocation1

REVIEW points:
- Master allocation dictionary parameters mapped for cross-class resolution.`
  },
  {
    id: 'class-03',
    classNumber: 3,
    className: 'POCostAllocation1',
    purpose: 'Perform stage-one allocation staging by fetching applicable cost allocation parameters per PO line item.',
    datasource: 'PO_I',
    grain: 'Per Item Allocation Staging',
    classLevelFields: [
      'DocumentNumber',
      'CostAllocationMethod',
      'LOB',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [
      'LOB = GETGROUPFROMSCHEMA2(CostAllocationMaster;LOB;{"CostAllocationMethod":"CostAllocationMethod", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}})'
    ],
    formulaRules: [],
    components: [
      {
        id: 'comp-03-1',
        name: 'CostAllocationValue',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'CostAllocationMaster',
        sourceColumn: 'CostAllocationValue',
        expression: '{"CostAllocationMethod":"CostAllocationMethod", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}}',
        description: 'FETCHFROMSCHEMA from CostAllocationMaster'
      }
    ],
    criteria: [
      'DocumentNumber (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Staged proportional allocation values per item with completion code TT.',
    dependencies: ['Class2 CostAllocationMaster (group, fetch)'],
    exposes: [
      'CostAllocationValue: summed by Class4 TCostAllocationValue, fetched by Class5 POCostAllocation'
    ],
    reviewPoints: 'None',
    associatedRequirements: ['BR-002', 'FR-003', 'TR-003'],
    rawText: `ClassNumber: 3
ClassName: POCostAllocation1
Purpose: Perform stage-one allocation staging by fetching applicable cost allocation parameters per PO line item.
Datasource: PO_I
Grain: Per Item Allocation Staging
Class-level fields: DocumentNumber, CostAllocationMethod, LOB, ForPrdFrom, ForPrdTo
Lookup rules: LOB = GETGROUPFROMSCHEMA2(CostAllocationMaster;LOB;{"CostAllocationMethod":"CostAllocationMethod", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}})
Formula rules: NA
Components required: CostAllocationValue (FETCHFROMSCHEMA)
Criteria required: DocumentNumber (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Staged proportional allocation values per item with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: Class2 CostAllocationMaster (group, fetch)
# ------------------------------------------------------------

EXPOSES:
- CostAllocationValue: summed by Class4 TCostAllocationValue, fetched by Class5 POCostAllocation

REVIEW points:
- Ensure stage-one allocation parameters correctly align with master dictionary definitions.`
  },
  {
    id: 'class-04',
    classNumber: 4,
    className: 'TCostAllocationValue',
    purpose: 'Sum the total cost allocation parameters per document and allocation method to establish the allocation denominator.',
    datasource: 'PO_I',
    grain: 'Total per Cost Allocation Method',
    classLevelFields: [
      'DocumentNumber',
      'CostAllocationMethod',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [],
    formulaRules: [],
    components: [
      {
        id: 'comp-04-1',
        name: 'TCostAllocationValue',
        type: 'SUMFROMSCHEMA',
        sourceClass: 'POCostAllocation1',
        sourceColumn: 'CostAllocationValue',
        expression: '{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"}',
        description: 'SUMFROMSCHEMA from POCostAllocation1'
      }
    ],
    criteria: [
      'DocumentNumber (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Aggregated ratio denominators per allocation group with completion code TT.',
    dependencies: ['Class3 POCostAllocation1 (sum)'],
    exposes: [
      'TCostAllocationValue: fetched by Class5 POCostAllocation'
    ],
    reviewPoints: 'None',
    associatedRequirements: ['BR-002', 'FR-003', 'TR-003'],
    rawText: `ClassNumber: 4
ClassName: TCostAllocationValue
Purpose: Sum the total cost allocation parameters per document and allocation method to establish the allocation denominator.
Datasource: PO_I
Grain: Total per Cost Allocation Method
Class-level fields: DocumentNumber, CostAllocationMethod, ForPrdFrom, ForPrdTo
Lookup rules: NA
Formula rules: NA
Components required: TCostAllocationValue (SUMFROMSCHEMA)
Criteria required: DocumentNumber (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Aggregated ratio denominators per allocation group with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: Class3 POCostAllocation1 (sum)
# ------------------------------------------------------------

EXPOSES:
- TCostAllocationValue: fetched by Class5 POCostAllocation

REVIEW points:
- Group total aggregation ensures proper ratio calculation in downstream allocation.`
  },
  {
    id: 'class-05',
    classNumber: 5,
    className: 'POCostAllocation',
    purpose: 'Compute final distributed financial values for PO items across designated Lines of Business.',
    datasource: 'PO_I',
    grain: 'Per Item Allocated Value',
    classLevelFields: [
      'DocumentNumber',
      'ItemID',
      'LOB',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [
      'LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"})'
    ],
    formulaRules: [
      'CostAllocationParameter = (CostAllocationValue / TCostAllocationValue)',
      'AllocatedBaseValue = (BaseValue * CostAllocationParameter)',
      'AllocatedDocumentValue = (DocumentValue * CostAllocationParameter)'
    ],
    components: [
      {
        id: 'comp-05-1',
        name: 'BaseValue',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'PO_ItemCalculation',
        sourceColumn: 'BaseValue',
        expression: '{"DocumentNumber":"DocumentNumber", "ItemID":"ItemID"}',
        description: 'FETCHFROMSCHEMA from PO_ItemCalculation'
      },
      {
        id: 'comp-05-2',
        name: 'DocumentValue',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'PO_ItemCalculation',
        sourceColumn: 'DocumentValue',
        expression: '{"DocumentNumber":"DocumentNumber", "ItemID":"ItemID"}',
        description: 'FETCHFROMSCHEMA from PO_ItemCalculation'
      },
      {
        id: 'comp-05-3',
        name: 'CostAllocationValue',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'POCostAllocation1',
        sourceColumn: 'CostAllocationValue',
        expression: '{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"}',
        description: 'FETCHFROMSCHEMA from POCostAllocation1'
      },
      {
        id: 'comp-05-4',
        name: 'TCostAllocationValue',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'TCostAllocationValue',
        sourceColumn: 'TCostAllocationValue',
        expression: '{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"}',
        description: 'FETCHFROMSCHEMA from TCostAllocationValue'
      },
      {
        id: 'comp-05-5',
        name: 'CostAllocationParameter',
        type: 'MATH',
        expression: '(CostAllocationValue / TCostAllocationValue)',
        description: 'Ratio of cost allocation'
      },
      {
        id: 'comp-05-6',
        name: 'AllocatedBaseValue',
        type: 'MATH',
        expression: '(BaseValue * CostAllocationParameter)',
        description: 'Allocated base value'
      },
      {
        id: 'comp-05-7',
        name: 'AllocatedDocumentValue',
        type: 'MATH',
        expression: '(DocumentValue * CostAllocationParameter)',
        description: 'Allocated document total'
      }
    ],
    criteria: [
      'DocumentNumber (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Final financial allocations per LOB mapped back to PO items with completion code TT.',
    dependencies: [
      'Class1 PO_ItemCalculation (fetch)',
      'Class3 POCostAllocation1 (group, fetch)',
      'Class4 TCostAllocationValue (fetch)'
    ],
    exposes: ['none'],
    reviewPoints: 'None',
    associatedRequirements: ['BR-002', 'BR-003', 'FR-003', 'TR-003'],
    rawText: `ClassNumber: 5
ClassName: POCostAllocation
Purpose: Compute final distributed financial values for PO items across designated Lines of Business.
Datasource: PO_I
Grain: Per Item Allocated Value
Class-level fields: DocumentNumber, ItemID, LOB, ForPrdFrom, ForPrdTo
Lookup rules: LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"})
Formula rules: CostAllocationParameter = (CostAllocationValue / TCostAllocationValue), AllocatedBaseValue = (BaseValue * CostAllocationParameter), AllocatedDocumentValue = (DocumentValue * CostAllocationParameter)
Components required: BaseValue (FETCHFROMSCHEMA), DocumentValue (FETCHFROMSCHEMA), CostAllocationValue (FETCHFROMSCHEMA), TCostAllocationValue (FETCHFROMSCHEMA), CostAllocationParameter (MATH), AllocatedBaseValue (MATH), AllocatedDocumentValue (MATH)
Criteria required: DocumentNumber (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Final financial allocations per LOB mapped back to PO items with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: Class1 PO_ItemCalculation (fetch), Class3 POCostAllocation1 (group, fetch), Class4 TCostAllocationValue (fetch)
# ------------------------------------------------------------

EXPOSES:
- none

REVIEW points:
- Final financial distribution verified against cross-class totals.`
  },
  {
    id: 'class-06',
    classNumber: 6,
    className: 'AP',
    purpose: 'Host workflow routing rules and SLA configurations per Line of Business.',
    datasource: 'AP',
    grain: 'Master Lookup',
    classLevelFields: [
      'LOB',
      'ActivityCode',
      'ActivityName',
      'UserID',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [],
    formulaRules: [],
    components: [
      {
        id: 'comp-06-1',
        name: 'TimeInMins',
        type: 'MATH',
        expression: 'TimeInMins',
        description: 'MATH pass-through'
      },
      {
        id: 'comp-06-2',
        name: 'TimeInDays',
        type: 'MATH',
        expression: 'TimeInDays',
        description: 'MATH pass-through'
      }
    ],
    criteria: [
      'LOB (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Master workflow configuration metrics with completion code TT.',
    dependencies: ['NA'],
    exposes: [
      'TimeInMins: fetched by Class7 POWF',
      'TimeInDays: fetched by Class7 POWF'
    ],
    reviewPoints: 'None',
    associatedRequirements: ['BR-004', 'FR-004', 'TR-004'],
    rawText: `ClassNumber: 6
ClassName: AP
Purpose: Host workflow routing rules and SLA configurations per Line of Business.
Datasource: AP
Grain: Master Lookup
Class-level fields: LOB, ActivityCode, ActivityName, UserID, ForPrdFrom, ForPrdTo
Lookup rules: NA
Formula rules: Pass-through mathematical components for exposed numeric fields.
Components required: TimeInMins (MATH), TimeInDays (MATH)
Criteria required: LOB (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Master workflow configuration metrics with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: NA
# ------------------------------------------------------------

EXPOSES:
- TimeInMins: fetched by Class7 POWF
- TimeInDays: fetched by Class7 POWF

REVIEW points:
- Workflow SLAs exposed for downstream approval engine validation.`
  },
  {
    id: 'class-07',
    classNumber: 7,
    className: 'POWF',
    purpose: 'Trigger required multi-tier workflow approvals based on document total value and LOB designation before accounting release.',
    datasource: 'PO_I',
    grain: 'Workflow Event',
    classLevelFields: [
      'DocumentNumber',
      'LOB',
      'ActivityCode',
      'ActivityName',
      'UserID',
      'ForPrdFrom',
      'ForPrdTo'
    ],
    lookupRules: [
      'LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber"})',
      'ActivityCode = GETGROUPFROMSCHEMA2(AP;ActivityCode;{"LOB":"LOB"})',
      'ActivityName = GETGROUPFROMSCHEMA2(AP;ActivityName;{"LOB":"LOB"})',
      'UserID = GETGROUPFROMSCHEMA2(AP;UserID;{"LOB":"LOB"})'
    ],
    formulaRules: [
      'WorkflowTrigger = 1'
    ],
    components: [
      {
        id: 'comp-07-1',
        name: 'DocumentValue',
        type: 'SUMFROMSCHEMA',
        sourceClass: 'PO_ItemCalculation',
        sourceColumn: 'DocumentValue',
        expression: '{"DocumentNumber":"DocumentNumber"}',
        description: 'SUMFROMSCHEMA from PO_ItemCalculation'
      },
      {
        id: 'comp-07-2',
        name: 'TimeInMins',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'AP',
        sourceColumn: 'TimeInMins',
        expression: '{"LOB":"LOB", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}}',
        description: 'FETCHFROMSCHEMA from AP'
      },
      {
        id: 'comp-07-3',
        name: 'TimeInDays',
        type: 'FETCHFROMSCHEMA',
        sourceClass: 'AP',
        sourceColumn: 'TimeInDays',
        expression: '{"LOB":"LOB", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}}',
        description: 'FETCHFROMSCHEMA from AP'
      },
      {
        id: 'comp-07-4',
        name: 'WorkflowTrigger',
        type: 'MATH',
        expression: '1',
        description: 'Workflow trigger constant'
      }
    ],
    criteria: [
      'DocumentNumber (EQ *)',
      'ForPrdFrom (2022-01-01)',
      'ForPrdTo ("")'
    ],
    conditions: [],
    expectedOutput: 'Workflow routing triggers and SLA boundaries mapped to the PO with completion code TT.',
    dependencies: [
      'Class1 PO_ItemCalculation (sum)',
      'Class3 POCostAllocation1 (group)',
      'Class6 AP (group, fetch)'
    ],
    exposes: ['none'],
    reviewPoints: 'None',
    associatedRequirements: ['BR-004', 'FR-005', 'TR-005'],
    rawText: `ClassNumber: 7
ClassName: POWF
Purpose: Trigger required multi-tier workflow approvals based on document total value and LOB designation before accounting release.
Datasource: PO_I
Grain: Workflow Event
Class-level fields: DocumentNumber, LOB, ActivityCode, ActivityName, UserID, ForPrdFrom, ForPrdTo
Lookup rules: LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber"}), ActivityCode = GETGROUPFROMSCHEMA2(AP;ActivityCode;{"LOB":"LOB"}), ActivityName = GETGROUPFROMSCHEMA2(AP;ActivityName;{"LOB":"LOB"}), UserID = GETGROUPFROMSCHEMA2(AP;UserID;{"LOB":"LOB"})
Formula rules: WorkflowTrigger = 1
Components required: DocumentValue (SUMFROMSCHEMA), TimeInMins (FETCHFROMSCHEMA), TimeInDays (FETCHFROMSCHEMA), WorkflowTrigger (MATH)
Criteria required: DocumentNumber (EQ *), ForPrdFrom (2022-01-01), ForPrdTo ("")
Conditions required: NA
Expected output: Workflow routing triggers and SLA boundaries mapped to the PO with completion code TT.

# --- DEPENDENCY --------------------------------------------
Dependency: Class1 PO_ItemCalculation (sum), Class3 POCostAllocation1 (group), Class6 AP (group, fetch)
# ------------------------------------------------------------

EXPOSES:
- none

REVIEW points:
- Approval thresholds linked to total document value calculations.`
  }
];
