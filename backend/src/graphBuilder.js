/**
 * graphBuilder.js
 * Builds adjacency lists and discovers connected components from valid edges.
 *
 * Multi-parent rule: First encountered parent edge for any child wins.
 *                    Subsequent parent edges for the same child are silently discarded.
 */

/**
 * Builds the graph data structures from valid non-duplicate edges.
 *
 * @param {{ parent: string, child: string }[]} validEdges
 * @returns {{
 *   adjList: Map<string, string[]>,   // parent → [children]
 *   parentMap: Map<string, string>,   // child → first parent (multi-parent rule)
 *   allNodes: Set<string>             // every node that appears
 * }}
 */
function buildGraph(validEdges) {
  const adjList = new Map();   // parent → [children]
  const parentMap = new Map(); // child → first parent
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {
    // Register nodes
    allNodes.add(parent);
    allNodes.add(child);

    // Multi-parent rule: first parent wins
    if (parentMap.has(child)) {
      // Silently discard this edge — child already has a parent
      continue;
    }
    parentMap.set(child, parent);

    // Build adjacency list
    if (!adjList.has(parent)) {
      adjList.set(parent, []);
    }
    adjList.get(parent).push(child);
  }

  return { adjList, parentMap, allNodes };
}

/**
 * Finds all connected components using Union-Find (path compression + rank).
 * Each component is a Set of nodes.
 *
 * @param {Set<string>} allNodes
 * @param {{ parent: string, child: string }[]} validEdges
 * @returns {Set<string>[]} Array of components (each is a Set of node labels)
 */
function findComponents(allNodes, validEdges) {
  const parent = {};
  const rank = {};

  // Initialize
  for (const node of allNodes) {
    parent[node] = node;
    rank[node] = 0;
  }

  function find(x) {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]); // Path compression
    }
    return parent[x];
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb;
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra;
    } else {
      parent[rb] = ra;
      rank[ra]++;
    }
  }

  // Union all edges (original edges, before multi-parent filtering, to capture correct components)
  for (const { parent: p, child: c } of validEdges) {
    union(p, c);
  }

  // Group nodes by root
  const componentMap = new Map();
  for (const node of allNodes) {
    const root = find(node);
    if (!componentMap.has(root)) {
      componentMap.set(root, new Set());
    }
    componentMap.get(root).add(node);
  }

  return Array.from(componentMap.values());
}

module.exports = { buildGraph, findComponents };
