/**
 * hierarchyProcessor.js
 * Orchestrates the full pipeline:
 *   1. processInput  → valid edges, invalid entries, duplicate edges
 *   2. buildGraph    → adjList, parentMap, allNodes
 *   3. findComponents→ connected component groups
 *   4. hasCycleInComponent → per-component cycle detection
 *   5. buildTree     → nested JSON + depth for non-cyclic trees
 *   6. summary       → total_trees, total_cycles, largest_tree_root
 *
 * Returns the complete structured response payload.
 */

const { processInput } = require('./validator');
const { buildGraph, findComponents } = require('./graphBuilder');
const { hasCycleInComponent } = require('./cycleDetector');
const { buildTree } = require('./treeBuilder');

// Identity fields — actual credentials
const IDENTITY = {
  user_id: 'vanshvinaychugh_02092005',
  email_id: 'vv0740@srmist.edu.in',
  college_roll_number: 'RA2311030010199',
};

/**
 * Finds the root(s) of a component given the parentMap and component nodes.
 * Root = a node that never appears as a child in ANY valid edge (globally).
 *
 * If no such root exists (pure cycle), use lexicographically smallest node.
 *
 * @param {Set<string>} componentNodes
 * @param {Map<string, string>} parentMap - child → parent (global)
 * @returns {string[]} Sorted array of root node labels for this component.
 */
function findRootsForComponent(componentNodes, parentMap) {
  const roots = [];
  for (const node of componentNodes) {
    if (!parentMap.has(node)) {
      roots.push(node);
    }
  }

  // Pure cycle: no node is parentMap-free → pick lex smallest
  if (roots.length === 0) {
    const sorted = Array.from(componentNodes).sort();
    return [sorted[0]];
  }

  return roots.sort();
}

/**
 * Main processing function. Takes raw request data and returns the full response.
 *
 * @param {any[]} data - The raw `data` array from the request body.
 * @returns {Object} Full response payload matching the spec.
 */
function processHierarchy(data) {
  // ── Step 1: Validate & classify inputs ──────────────────────────────────
  const { validEdges, invalidEntries, duplicateEdges } = processInput(data);

  // ── Step 2: Build directed graph ────────────────────────────────────────
  const { adjList, parentMap, allNodes } = buildGraph(validEdges);

  // ── Step 3: Find connected components ───────────────────────────────────
  // Edge case: no valid edges at all → no hierarchies
  if (allNodes.size === 0) {
    return {
      ...IDENTITY,
      hierarchies: [],
      invalid_entries: invalidEntries,
      duplicate_edges: duplicateEdges,
      summary: {
        total_trees: 0,
        total_cycles: 0,
        largest_tree_root: '',
      },
    };
  }

  const components = findComponents(allNodes, validEdges);

  // ── Step 4: Process each component ──────────────────────────────────────
  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;

  // Track largest tree: { root, depth }
  let largestTreeRoot = '';
  let largestTreeDepth = -1;

  for (const componentNodes of components) {
    const isCyclic = hasCycleInComponent(componentNodes, adjList);
    const roots = findRootsForComponent(componentNodes, parentMap);

    if (isCyclic) {
      // One cycle group per component (regardless of how many "roots")
      totalCycles += 1;

      // Use lex-smallest root for the cycle entry
      const cycleRoot = roots[0];
      hierarchies.push({
        root: cycleRoot,
        tree: {},
        has_cycle: true,
      });
    } else {
      // Each root in a non-cyclic component is its own tree entry
      for (const root of roots) {
        totalTrees += 1;
        const { tree, depth } = buildTree(root, adjList);

        hierarchies.push({
          root,
          tree,
          depth,
        });

        // Track largest: prefer deeper, then lex smaller on tie
        if (
          depth > largestTreeDepth ||
          (depth === largestTreeDepth && root < largestTreeRoot)
        ) {
          largestTreeDepth = depth;
          largestTreeRoot = root;
        }
      }
    }
  }

  // ── Step 5: Assemble response ────────────────────────────────────────────
  return {
    ...IDENTITY,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

module.exports = { processHierarchy };
