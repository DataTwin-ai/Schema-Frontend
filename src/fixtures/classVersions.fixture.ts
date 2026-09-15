import { ClassVersion } from '../types';

export const sampleClassVersions: Record<string, ClassVersion[]> = {
  'class-01': [
    {
      id: 'c1-v1',
      classId: 'class-01',
      classNumber: 1,
      className: 'PO_ItemCalculation',
      versionNumber: 1,
      title: 'Class #1 · PO_ItemCalculation (Ingestion & Line Valuation)',
      purpose: 'Ingest Purchase Order item data and compute line valuations including base values, taxes, and document totals.',
      datasource: 'PO_I',
      grain: 'Per Item',
      specification: `DATASOURCE: PO_I
SETTLEMENT GRAIN: Per Item

PURPOSE & BUSINESS LOGIC:
Ingest Purchase Order item data and compute line valuations including base values, taxes, and document totals.

COMPONENTS (9):
- Qty [Source]: Qty
- Rate [Source]: Rate
- Discount [Source]: Discount
- AddlCharge [Source]: AddlCharge
- TaxPercentage [Source]: TaxPercentage
- BaseValue [MATH]: (Qty * Rate)
- TaxableBase [MATH]: BaseValue - Discount + AddlCharge
- TaxValue [MATH]: TaxableBase * (TaxPercentage / 100)
- DocumentValue [MATH]: TaxableBase + TaxValue

FORMULA RULES:
- BaseValue = (Qty * Rate)
- TaxableBase = BaseValue - Discount + AddlCharge
- TaxValue = TaxableBase * (TaxPercentage / 100)
- DocumentValue = TaxableBase + TaxValue

CRITERIA & FILTER LOGIC:
- DocumentNumber EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- BaseValue: fetched by Class5 POCostAllocation
- DocumentValue: fetched by Class5 POCostAllocation, summed by Class7 POWF`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial schema class generated from PO line calculation rules',
    },
  ],
  'class-02': [
    {
      id: 'c2-v1',
      classId: 'class-02',
      classNumber: 2,
      className: 'CostAllocationMaster',
      versionNumber: 1,
      title: 'Class #2 · CostAllocationMaster (Master Data Dictionary)',
      purpose: 'Serve as the master data dictionary for Line of Business (LOB) cost allocation parameters.',
      datasource: 'CA',
      grain: 'Master Lookup',
      specification: `DATASOURCE: CA
SETTLEMENT GRAIN: Master Lookup

PURPOSE & BUSINESS LOGIC:
Serve as the master data dictionary for Line of Business (LOB) cost allocation parameters.

COMPONENTS (1):
- CostAllocationValue [MATH]: CostAllocationValue (MATH pass-through)

CRITERIA & FILTER LOGIC:
- CostAllocationMethod EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- CostAllocationValue: fetched by Class3 POCostAllocation1`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial allocation master generation',
    },
  ],
  'class-03': [
    {
      id: 'c3-v1',
      classId: 'class-03',
      classNumber: 3,
      className: 'POCostAllocation1',
      versionNumber: 1,
      title: 'Class #3 · POCostAllocation1 (Stage-One Allocation Staging)',
      purpose: 'Perform stage-one allocation staging by fetching applicable cost allocation parameters per PO line item.',
      datasource: 'PO_I',
      grain: 'Per Item Allocation Staging',
      specification: `DATASOURCE: PO_I
SETTLEMENT GRAIN: Per Item Allocation Staging

PURPOSE & BUSINESS LOGIC:
Perform stage-one allocation staging by fetching applicable cost allocation parameters per PO line item.

LOOKUP RULES:
- LOB = GETGROUPFROMSCHEMA2(CostAllocationMaster;LOB;{"CostAllocationMethod":"CostAllocationMethod", "ForPrdFrom":{"equality":"LE","value":"ForPrdTo"}, "ForPrdTo":{"equality":"GE","value":"ForPrdFrom"}})

COMPONENTS (1):
- CostAllocationValue [FETCHFROMSCHEMA]: from CostAllocationMaster

CRITERIA & FILTER LOGIC:
- DocumentNumber EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- CostAllocationValue: summed by Class4 TCostAllocationValue, fetched by Class5 POCostAllocation`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial stage-one cost allocation mapping model',
    },
  ],
  'class-04': [
    {
      id: 'c4-v1',
      classId: 'class-04',
      classNumber: 4,
      className: 'TCostAllocationValue',
      versionNumber: 1,
      title: 'Class #4 · TCostAllocationValue (Allocation Denominator Summation)',
      purpose: 'Sum the total cost allocation parameters per document and allocation method to establish the allocation denominator.',
      datasource: 'PO_I',
      grain: 'Total per Cost Allocation Method',
      specification: `DATASOURCE: PO_I
SETTLEMENT GRAIN: Total per Cost Allocation Method

PURPOSE & BUSINESS LOGIC:
Sum the total cost allocation parameters per document and allocation method to establish the allocation denominator.

COMPONENTS (1):
- TCostAllocationValue [SUMFROMSCHEMA]: from POCostAllocation1

CRITERIA & FILTER LOGIC:
- DocumentNumber EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- TCostAllocationValue: fetched by Class5 POCostAllocation`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial allocation denominator aggregator',
    },
  ],
  'class-05': [
    {
      id: 'c5-v1',
      classId: 'class-05',
      classNumber: 5,
      className: 'POCostAllocation',
      versionNumber: 1,
      title: 'Class #5 · POCostAllocation (Final Distributed Allocations)',
      purpose: 'Compute final distributed financial values for PO items across designated Lines of Business.',
      datasource: 'PO_I',
      grain: 'Per Item Allocated Value',
      specification: `DATASOURCE: PO_I
SETTLEMENT GRAIN: Per Item Allocated Value

PURPOSE & BUSINESS LOGIC:
Compute final distributed financial values for PO items across designated Lines of Business.

LOOKUP RULES:
- LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber", "CostAllocationMethod":"CostAllocationMethod"})

FORMULA RULES:
- CostAllocationParameter = (CostAllocationValue / TCostAllocationValue)
- AllocatedBaseValue = (BaseValue * CostAllocationParameter)
- AllocatedDocumentValue = (DocumentValue * CostAllocationParameter)

COMPONENTS (7):
- BaseValue [FETCHFROMSCHEMA]: from PO_ItemCalculation
- DocumentValue [FETCHFROMSCHEMA]: from PO_ItemCalculation
- CostAllocationValue [FETCHFROMSCHEMA]: from POCostAllocation1
- TCostAllocationValue [FETCHFROMSCHEMA]: from TCostAllocationValue
- CostAllocationParameter [MATH]: (CostAllocationValue / TCostAllocationValue)
- AllocatedBaseValue [MATH]: (BaseValue * CostAllocationParameter)
- AllocatedDocumentValue [MATH]: (DocumentValue * CostAllocationParameter)

CRITERIA & FILTER LOGIC:
- DocumentNumber EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- none`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial proportional financial distribution class',
    },
  ],
  'class-06': [
    {
      id: 'c6-v1',
      classId: 'class-06',
      classNumber: 6,
      className: 'AP',
      versionNumber: 1,
      title: 'Class #6 · AP (Workflow SLA & Routing Rules)',
      purpose: 'Host workflow routing rules and SLA configurations per Line of Business.',
      datasource: 'AP',
      grain: 'Master Lookup',
      specification: `DATASOURCE: AP
SETTLEMENT GRAIN: Master Lookup

PURPOSE & BUSINESS LOGIC:
Host workflow routing rules and SLA configurations per Line of Business.

COMPONENTS (2):
- TimeInMins [MATH]: TimeInMins (MATH pass-through)
- TimeInDays [MATH]: TimeInDays (MATH pass-through)

CRITERIA & FILTER LOGIC:
- LOB EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- TimeInMins: fetched by Class7 POWF
- TimeInDays: fetched by Class7 POWF`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial workflow SLA & routing configuration master',
    },
  ],
  'class-07': [
    {
      id: 'c7-v1',
      classId: 'class-07',
      classNumber: 7,
      className: 'POWF',
      versionNumber: 1,
      title: 'Class #7 · POWF (Multi-Tier Workflow Approvals)',
      purpose: 'Trigger required multi-tier workflow approvals based on document total value and LOB designation before accounting release.',
      datasource: 'PO_I',
      grain: 'Workflow Event',
      specification: `DATASOURCE: PO_I
SETTLEMENT GRAIN: Workflow Event

PURPOSE & BUSINESS LOGIC:
Trigger required multi-tier workflow approvals based on document total value and LOB designation before accounting release.

LOOKUP RULES:
- LOB = GETGROUPFROMSCHEMA2(POCostAllocation1;LOB;{"DocumentNumber":"DocumentNumber"})
- ActivityCode = GETGROUPFROMSCHEMA2(AP;ActivityCode;{"LOB":"LOB"})
- ActivityName = GETGROUPFROMSCHEMA2(AP;ActivityName;{"LOB":"LOB"})
- UserID = GETGROUPFROMSCHEMA2(AP;UserID;{"LOB":"LOB"})

FORMULA RULES:
- WorkflowTrigger = 1

COMPONENTS (4):
- DocumentValue [SUMFROMSCHEMA]: from PO_ItemCalculation
- TimeInMins [FETCHFROMSCHEMA]: from AP
- TimeInDays [FETCHFROMSCHEMA]: from AP
- WorkflowTrigger [MATH]: 1

CRITERIA & FILTER LOGIC:
- DocumentNumber EQ *
- ForPrdFrom (2022-01-01)
- ForPrdTo ("")

EXPOSES:
- none`,
      actor: 'AI Engine',
      timestamp: 'Sep 08, 2026 · 10:15 AM',
      changeType: 'INITIAL_GENERATION',
      changeSummary: 'Initial multi-tier workflow approval triggers',
    },
  ],
};
