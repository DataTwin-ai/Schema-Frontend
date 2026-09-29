/**
 * Lightweight, high-precision text diff utility for business requirements.
 * Performs block, line, and word-level diffing to highlight additions and removals.
 */

export type DiffPartType = 'unchanged' | 'added' | 'removed';

export interface DiffToken {
  type: DiffPartType;
  value: string;
}

export interface DiffLine {
  type: DiffPartType | 'modified';
  tokens: DiffToken[];
  text: string;
  lineNumber?: number;
}

export interface DiffSummary {
  additions: number;
  removals: number;
  hasChanges: boolean;
}

export interface VersionDiffResult {
  previousLines: DiffLine[];
  currentLines: DiffLine[];
  titleDiff: {
    previousTokens: DiffToken[];
    currentTokens: DiffToken[];
    hasChanges: boolean;
  };
  summary: DiffSummary;
}

/**
 * Standard Longest Common Subsequence (LCS) for generic arrays
 */
function computeLCS<T>(arr1: T[], arr2: T[], isEqual: (a: T, b: T) => boolean = (a, b) => a === b): number[][] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (isEqual(arr1[i - 1], arr2[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Tokenizes a string into words, whitespace, and punctuation for word-level diffing
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  const tokens = text.match(/[\w]+|[^\w\s]+|\s+/g);
  return tokens || [text];
}

/**
 * Computes word-level diff between two single lines or strings
 */
export function computeWordDiff(
  oldStr: string,
  newStr: string
): { previousTokens: DiffToken[]; currentTokens: DiffToken[]; additions: number; removals: number } {
  if (oldStr === newStr) {
    return {
      previousTokens: [{ type: 'unchanged', value: oldStr }],
      currentTokens: [{ type: 'unchanged', value: newStr }],
      additions: 0,
      removals: 0,
    };
  }

  const oldTokens = tokenizeWords(oldStr);
  const newTokens = tokenizeWords(newStr);
  const dp = computeLCS(oldTokens, newTokens);

  let i = oldTokens.length;
  let j = newTokens.length;

  const tempPrev: DiffToken[] = [];
  const tempCurr: DiffToken[] = [];
  let additions = 0;
  let removals = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      tempPrev.push({ type: 'unchanged', value: oldTokens[i - 1] });
      tempCurr.push({ type: 'unchanged', value: newTokens[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempCurr.push({ type: 'added', value: newTokens[j - 1] });
      if (newTokens[j - 1].trim().length > 0) additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      tempPrev.push({ type: 'removed', value: oldTokens[i - 1] });
      if (oldTokens[i - 1].trim().length > 0) removals++;
      i--;
    }
  }

  return {
    previousTokens: tempPrev.reverse(),
    currentTokens: tempCurr.reverse(),
    additions,
    removals,
  };
}

/**
 * Computes similarity ratio between two strings (0.0 to 1.0)
 */
function computeSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const t1 = tokenizeWords(s1);
  const t2 = tokenizeWords(s2);
  const dp = computeLCS(t1, t2);
  const common = dp[t1.length][t2.length];
  return (2.0 * common) / (t1.length + t2.length);
}

/**
 * Computes comprehensive version diff with line-by-line alignment and intra-line word diffs
 */
export function computeVersionDiff(
  oldText: string,
  newText: string,
  oldTitle: string = '',
  newTitle: string = ''
): VersionDiffResult {
    const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const isLarge = (oldLines.length + newLines.length) > 5000;

  // Line-level LCS
  const dp = computeLCS(oldLines, newLines);

  let i = oldLines.length;
  let j = newLines.length;

  type IntermediateEntry = 
    | { kind: 'unchanged'; oldLine: string; newLine: string }
    | { kind: 'removed'; oldLine: string }
    | { kind: 'added'; newLine: string };

  const rawEntries: IntermediateEntry[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rawEntries.push({ kind: 'unchanged', oldLine: oldLines[i - 1], newLine: newLines[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawEntries.push({ kind: 'added', newLine: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawEntries.push({ kind: 'removed', oldLine: oldLines[i - 1] });
      i--;
    }
  }

  rawEntries.reverse();

  const previousLines: DiffLine[] = [];
  const currentLines: DiffLine[] = [];

  let totalAdditions = 0;
  let totalRemovals = 0;

  // Process raw entries and detect paired modifications for intra-line word diffing
  for (let idx = 0; idx < rawEntries.length; idx++) {
    const entry = rawEntries[idx];

    if (entry.kind === 'unchanged') {
      previousLines.push({
        type: 'unchanged',
        text: entry.oldLine,
        tokens: [{ type: 'unchanged', value: entry.oldLine }],
      });
      currentLines.push({
        type: 'unchanged',
        text: entry.newLine,
        tokens: [{ type: 'unchanged', value: entry.newLine }],
      });
    } else if (
      entry.kind === 'removed' &&
      idx + 1 < rawEntries.length &&
      rawEntries[idx + 1].kind === 'added'
    ) {
      // Paired change: Old line replaced by New line
      const nextEntry = rawEntries[idx + 1] as { kind: 'added'; newLine: string };
      const sim = computeSimilarity(entry.oldLine, nextEntry.newLine);

      if (sim > 0.3 && !isLarge) {
        // High similarity: compute intra-line word-level diff
        const wordDiff = computeWordDiff(entry.oldLine, nextEntry.newLine);
        previousLines.push({
          type: 'modified',
          text: entry.oldLine,
          tokens: wordDiff.previousTokens,
        });
        currentLines.push({
          type: 'modified',
          text: nextEntry.newLine,
          tokens: wordDiff.currentTokens,
        });
        totalAdditions += wordDiff.additions;
        totalRemovals += wordDiff.removals;
      } else {
        // Completely different line
        previousLines.push({
          type: 'removed',
          text: entry.oldLine,
          tokens: [{ type: 'removed', value: entry.oldLine }],
        });
        currentLines.push({
          type: 'added',
          text: nextEntry.newLine,
          tokens: [{ type: 'added', value: nextEntry.newLine }],
        });
        if (nextEntry.newLine.trim()) totalAdditions++;
        if (entry.oldLine.trim()) totalRemovals++;
      }
      idx++; // skip paired entry
    } else if (entry.kind === 'removed') {
      previousLines.push({
        type: 'removed',
        text: entry.oldLine,
        tokens: [{ type: 'removed', value: entry.oldLine }],
      });
      if (entry.oldLine.trim()) totalRemovals++;
    } else if (entry.kind === 'added') {
      currentLines.push({
        type: 'added',
        text: entry.newLine,
        tokens: [{ type: 'added', value: entry.newLine }],
      });
      if (entry.newLine.trim()) totalAdditions++;
    }
  }

  // Title Diff
  const titleDiffResult = computeWordDiff(oldTitle, newTitle);
  if (titleDiffResult.additions > 0) totalAdditions += titleDiffResult.additions;
  if (titleDiffResult.removals > 0) totalRemovals += titleDiffResult.removals;

  return {
    previousLines,
    currentLines,
    titleDiff: {
      previousTokens: titleDiffResult.previousTokens,
      currentTokens: titleDiffResult.currentTokens,
      hasChanges: oldTitle !== newTitle,
    },
    summary: {
      additions: totalAdditions,
      removals: totalRemovals,
      hasChanges: totalAdditions > 0 || totalRemovals > 0 || oldTitle !== newTitle,
    },
  };
}
