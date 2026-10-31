export interface ClassPlanRow {
  number: number;
  className: string;
  datasource: string;
  trigger: string;
}

export const VALID_TRIGGERS = [
  '1', '2', '3', '3A', '3B', '3C', '4', '4A', '5', '6', '7', '8'
];

export const DEFAULT_DATASOURCES = [
  'Active_TaxSys',
  'Active_FS',
  '#consolidate#'
];

export function parseLockedPlan(text: string): { classes: ClassPlanRow[]; unmetText: string } {
  const classes: ClassPlanRow[] = [];
  if (!text) return { classes, unmetText: '' };

  const lines = text.split('\n');
  let isUnmetSection = false;
  const unmetLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.includes('===== UNMET REQUIREMENTS')) {
      isUnmetSection = true;
      unmetLines.push(rawLine);
      continue;
    }

    if (isUnmetSection) {
      unmetLines.push(rawLine);
      continue;
    }

    const match = line.match(/^(\d+)\.\s*ClassName:\s*([^|]+)\|\s*Datasource:\s*([^|]+)(?:\|\s*Trigger:\s*([^|\r\n]+))?/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const className = match[2].trim();
      const datasource = match[3].trim();
      const trigger = match[4] ? match[4].trim() : '2';
      classes.push({
        number: num,
        className,
        datasource,
        trigger,
      });
    }
  }

  return { classes, unmetText: unmetLines.join('\n') };
}

export function renderLockedPlan(classes: ClassPlanRow[], unmetText?: string): string {
  const count = classes.length;
  let text = '===== LOCKED CLASS PLAN (MANDATORY) =====\n';
  text += `Generate EXACTLY ${count} classes, in EXACTLY this order, with EXACTLY these ClassName and Datasource values.\n`;
  text += 'Do not add, remove, merge, split, rename or reorder classes. This plan overrides any other instruction about which classes to create.\n';

  classes.forEach((c, idx) => {
    const num = idx + 1;
    const name = c.className.trim() || `Class_${num}`;
    const ds = c.datasource.trim() || 'Active_TaxSys';
    const trig = c.trigger.trim() || '2';
    text += `${num}. ClassName: ${name} | Datasource: ${ds} | Trigger: ${trig}\n`;
  });

  if (unmetText && unmetText.trim()) {
    if (!unmetText.includes('===== UNMET REQUIREMENTS')) {
      text += '\n===== UNMET REQUIREMENTS (NO SOURCE SUPPLIED) =====\n';
    } else {
      text += '\n';
    }
    text += unmetText.trim() + '\n';
  }

  return text;
}

export function validateClassPlanRows(
  rows: ClassPlanRow[],
  allowedDatasources?: string[]
): Record<number, string[]> {
  const errorsByLine: Record<number, string[]> = {};
  const seenNames = new Map<string, number>();

  rows.forEach((row, idx) => {
    const lineNum = idx + 1;
    const errors: string[] = [];

    const name = (row.className || '').trim();
    if (!name) {
      errors.push('ClassName is required');
    } else {
      if (!/^[A-Za-z]/.test(name)) {
        errors.push("Must start with a letter");
      }
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
        errors.push("Can only contain letters, numbers, and underscores");
      }
      const lower = name.toLowerCase();
      if (seenNames.has(lower)) {
        errors.push(`Duplicate class name (same as row ${seenNames.get(lower)})`);
      } else {
        seenNames.set(lower, lineNum);
      }
    }

    const ds = (row.datasource || '').trim();
    if (!ds) {
      errors.push('Datasource is required');
    } else if (allowedDatasources && allowedDatasources.length > 0) {
      const allowedLower = allowedDatasources.map(d => d.toLowerCase());
      if (!allowedLower.includes(ds.toLowerCase()) && ds.toLowerCase() !== '#consolidate#') {
        errors.push(`'${ds}' is not a registered datasource`);
      }
    }

    const trig = (row.trigger || '').trim().toUpperCase();
    if (!trig) {
      errors.push('Trigger is required');
    } else if (!VALID_TRIGGERS.includes(trig)) {
      errors.push(`Invalid Trigger '${trig}'`);
    }

    if (errors.length > 0) {
      errorsByLine[lineNum] = errors;
    }
  });

  return errorsByLine;
}
