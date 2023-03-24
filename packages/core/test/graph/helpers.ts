import {
  addEdge,
  ensureVertex,
  constructEmptyAdjacencyList,
} from "../../src/internal/graph/adjacencyList";

export function constructAdjacencyList(
  edges: Array<{ from: number; to: number }>
) {
  const adjacencyList = constructEmptyAdjacencyList();

  const vertexes = edges.reduce((acc, { from, to }) => {
    acc.add(from);
    acc.add(to);
    return acc;
  }, new Set<number>());

  for (const vertex of vertexes.values()) {
    ensureVertex(adjacencyList, vertex);
  }

  for (const { from, to } of edges) {
    addEdge(adjacencyList, { from, to });
  }

  return adjacencyList;
}

export function buildAdjacencyListFrom(literal: { [key: number]: number[] }) {
  const expectedMap = new Map<number, Set<number>>();

  for (const [key, list] of Object.entries(literal)) {
    expectedMap.set(parseInt(key, 10), new Set<number>(list));
  }

  return expectedMap;
}
