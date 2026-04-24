/**
 * validator.js
 * Handles input validation for edge strings.
 * Valid format: X->Y where X and Y are each a SINGLE uppercase letter A-Z,
 * X !== Y (no self-loops), trimmed before checking.
 */

const VALID_EDGE_REGEX = /^([A-Z])->([A-Z])$/;

/**
 * Validates a single edge string (after trimming).
 * @param {string} raw - The raw string from the input array.
 * @returns {{ valid: boolean, parent: string|null, child: string|null }}
 */
function validateEdge(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  // Empty string check
  if (trimmed === '') {
    return { valid: false, parent: null, child: null };
  }

  const match = trimmed.match(VALID_EDGE_REGEX);
  if (!match) {
    return { valid: false, parent: null, child: null };
  }

  const [, parent, child] = match;

  // Self-loop check: A->A is invalid
  if (parent === child) {
    return { valid: false, parent: null, child: null };
  }

  return { valid: true, parent, child };
}

/**
 * Processes the raw data array into:
 *  - validEdges: [{ parent, child }] (first occurrence only)
 *  - invalidEntries: string[] (original trimmed strings that failed validation)
 *  - duplicateEdges: string[] (edges seen more than once, stored as "X->Y", each only once)
 *
 * @param {any[]} data - Raw input array.
 * @returns {{ validEdges, invalidEntries, duplicateEdges }}
 */
function processInput(data) {
  const validEdges = [];
  const invalidEntries = [];
  const duplicateEdges = [];

  // Track edges seen: key = "X->Y" → boolean (true = already used)
  const seenEdges = new Set();
  // Track which duplicates we've already recorded (to avoid recording same dup twice)
  const recordedDuplicates = new Set();

  if (!Array.isArray(data)) {
    return { validEdges, invalidEntries: [], duplicateEdges };
  }

  for (const raw of data) {
    const trimmed = typeof raw === 'string' ? raw.trim() : String(raw).trim();
    const { valid, parent, child } = validateEdge(raw);

    if (!valid) {
      invalidEntries.push(trimmed);
      continue;
    }

    const edgeKey = `${parent}->${child}`;

    if (seenEdges.has(edgeKey)) {
      // Duplicate: record once
      if (!recordedDuplicates.has(edgeKey)) {
        duplicateEdges.push(edgeKey);
        recordedDuplicates.add(edgeKey);
      }
    } else {
      seenEdges.add(edgeKey);
      validEdges.push({ parent, child });
    }
  }

  return { validEdges, invalidEntries, duplicateEdges };
}

module.exports = { validateEdge, processInput };
