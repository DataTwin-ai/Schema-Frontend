import { SchemaVersion } from '../types';
import { rawSchemaJson } from './schema.fixture';

// Generate realistic previous versions with slight modifications for diff comparison
const createVersion1Json = (): string => {
  const v1 = JSON.parse(JSON.stringify(rawSchemaJson));
  // Baseline version with subset of approval activities
  if (v1.AP && Array.isArray(v1.AP)) {
    v1.AP = v1.AP.slice(0, 10);
  }
  return JSON.stringify(v1, null, 2);
};

const createVersion2Json = (): string => {
  const v2 = JSON.parse(JSON.stringify(rawSchemaJson));
  if (v2.AP && Array.isArray(v2.AP)) {
    v2.AP = v2.AP.slice(0, 25);
  }
  return JSON.stringify(v2, null, 2);
};

export const sampleSchemaVersions: SchemaVersion[] = [
  {
    id: 'schema-v1',
    versionNumber: 1,
    schemaGroupName: 'PO Validation',
    rawJson: createVersion1Json(),
    timestamp: 'Sep 08, 2026 · 10:45 AM',
    actor: 'AI Generation Engine',
    changeSummary: 'Initial compiled PO Validation schema specification',
  },
  {
    id: 'schema-v2',
    versionNumber: 2,
    schemaGroupName: 'PO Validation',
    rawJson: createVersion2Json(),
    timestamp: 'Sep 09, 2026 · 02:30 PM',
    actor: 'Logaprasanth (User)',
    changeSummary: 'Expanded workflow approval routing matrix across all 18 LOBs',
  },
];
