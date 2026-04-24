/**
 * cycleDetector.js
 * DFS-based cycle detection scoped to a single connected component.
 * Uses a "recursion stack" (grey-white-black coloring) to detect back-edges.
 */

/**
 * Detects whether a cycle exists within a set of nodes using the provided adjacency list.
 *
 * @param {Set<string>} componentNodes - Nodes belonging to this component.
 * @param {Map<string, string[]>} adjList - Full graph adjacency list.
 * @returns {boolean} true if a cycle is present in this component.
 */
function hasCycleInComponent(componentNodes, adjList) {
  // 0 = unvisited, 1 = in-stack (grey), 2 = done (black)
  const color = {};
  for (const node of componentNodes) {
    color[node] = 0;
  }

  function dfs(node) {
    color[node] = 1; // Mark as in-stack

    const children = adjList.get(node) || [];
    for (const child of children) {
      // Only traverse within this component
      if (!componentNodes.has(child)) continue;

      if (color[child] === 1) {
        // Back-edge → cycle detected
        return true;
      }
      if (color[child] === 0) {
        if (dfs(child)) return true;
      }
    }

    color[node] = 2; // Done
    return false;
  }

  for (const node of componentNodes) {
    if (color[node] === 0) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

module.exports = { hasCycleInComponent };
