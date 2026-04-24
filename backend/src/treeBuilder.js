/**
 * treeBuilder.js
 * Builds the nested tree JSON structure and calculates max depth for a component.
 *
 * Tree format: { "A": { "B": { "D": {} }, "C": {} } }
 * Depth = number of nodes on longest root-to-leaf path (counting nodes, not edges).
 */

/**
 * Recursively builds a nested tree object starting from `node`.
 * Uses a visited set to guard against unexpected cycles (should not happen
 * in non-cyclic components, but added for safety).
 *
 * @param {string} node - Current node.
 * @param {Map<string, string[]>} adjList - Adjacency list.
 * @param {Set<string>} visited - Nodes already added in this path.
 * @returns {Object} Nested tree object.
 */
function buildTreeNode(node, adjList, visited) {
  if (visited.has(node)) return {}; // Safety guard
  visited.add(node);

  const children = adjList.get(node) || [];
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildTreeNode(child, adjList, new Set(visited));
  }

  return subtree;
}

/**
 * Computes the maximum depth (node count) of the tree rooted at `node`.
 * Depth of a single leaf = 1.
 *
 * @param {string} node - Root node.
 * @param {Map<string, string[]>} adjList - Adjacency list.
 * @param {Set<string>} visited - Guard against cycles.
 * @returns {number}
 */
function computeDepth(node, adjList, visited) {
  if (visited.has(node)) return 0; // Cycle guard
  visited.add(node);

  const children = adjList.get(node) || [];
  if (children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const child of children) {
    const d = computeDepth(child, adjList, new Set(visited));
    if (d > maxChildDepth) maxChildDepth = d;
  }

  return 1 + maxChildDepth;
}

/**
 * Builds the full nested tree JSON and returns { tree, depth } for a non-cyclic component.
 *
 * @param {string} root - Root node label.
 * @param {Map<string, string[]>} adjList - Full adjacency list.
 * @returns {{ tree: Object, depth: number }}
 */
function buildTree(root, adjList) {
  const treeContent = buildTreeNode(root, adjList, new Set());
  const wrappedTree = { [root]: treeContent };
  const depth = computeDepth(root, adjList, new Set());
  return { tree: wrappedTree, depth };
}

module.exports = { buildTree };
