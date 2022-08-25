import { DiGraph, TopologicalSort } from "js-graph-algorithms";

export type AdjacencyList = Map<number, Set<number>>;

export function constructEmptyAdjacencyList(): AdjacencyList {
  return new Map<number, Set<number>>();
}

export function addEdge(
  adjacencyList: AdjacencyList,
  { from, to }: { from: number; to: number }
) {
  const toSet = adjacencyList.get(from) ?? new Set<number>();

  toSet.add(to);

  adjacencyList.set(from, toSet);
}

export function getDependenciesFor(adjacencyList: AdjacencyList, to: number) {
  return [...adjacencyList.entries()]
    .filter(([_from, toSet]) => toSet.has(to))
    .map(([from]) => from);
}

export function clone(adjacencyList: AdjacencyList): AdjacencyList {
  const newList: AdjacencyList = new Map();

  for (const [from, toSet] of adjacencyList.entries()) {
    newList.set(from, new Set<number>(toSet));
  }

  return newList;
}

export function topologicalSort(adjacencyList: AdjacencyList): number[] {
  if (adjacencyList.size === 0) {
    return [];
  }

  const vertexes = [...adjacencyList.values()].reduce(
    (acc, v) => new Set<number>([...acc].concat([...v])),
    new Set<number>(adjacencyList.keys())
  );

  const dag = new DiGraph(Math.max(...vertexes) + 1);

  for (const [from, toSet] of adjacencyList.entries()) {
    for (const to of toSet) {
      dag.addEdge(from, to);
    }
  }

  const ts = new TopologicalSort(dag);
  const order = ts.order();

  return order;
}
