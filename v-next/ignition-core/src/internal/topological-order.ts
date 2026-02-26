export type Graph<T> = Map<T, Set<T>>;

export function getNodesInTopologicalOrder<T>(graph: Graph<T>): T[] {
  const visited = new Set();
  const sorted: T[] = [];

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      visit(graph, node, visited, sorted);
    }
  }

  return sorted.reverse();
}

function visit<T>(graph: Graph<T>, node: T, visited: Set<T>, sorted: T[]) {
  visited.add(node);

  for (const to of graph.get(node)!) {
    if (!visited.has(to)) {
      visit(graph, to, visited, sorted);
    }
  }

  sorted.push(node);
}
