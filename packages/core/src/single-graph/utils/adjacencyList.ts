import { DiGraph, TopologicalSort } from "js-graph-algorithms";

export type AdjacencyList = Array<Set<number>>;

export function constructEmptyAdjacencyList(): Array<Set<number>> {
  return [];
}

export function addEdge(
  adjacencyList: AdjacencyList,
  { from, to }: { from: number; to: number }
) {
  const toSet = adjacencyList[from] ?? new Set<number>();

  toSet.add(to);

  adjacencyList[from] = toSet;
}

export function getDependenciesFor(adjacencyList: AdjacencyList, to: number) {
  const depIds = [];

  for (let from = 0; from < adjacencyList.length; from++) {
    if (adjacencyList[from].has(to)) {
      depIds.push(from);
    }
  }

  return depIds;
}

export function clone(adjacencyList: AdjacencyList): AdjacencyList {
  const newList: AdjacencyList = [];

  for (let i = 0; i < adjacencyList.length; i++) {
    newList[i] = new Set<number>(adjacencyList[i]);
  }

  return newList;
}

export function topologicalSort(adjacencyList: AdjacencyList): number[] {
  if (adjacencyList.length === 0) {
    return [];
  }

  const vertexes = adjacencyList.reduce((acc: Set<number>, v: Set<number>) => {
    return new Set([...acc].concat([...v]));
  }, new Set<number>(adjacencyList.keys()));

  const dag = new DiGraph(Math.max(...vertexes) + 1);

  for (let from = 0; from < adjacencyList.length; from++) {
    const toSet = adjacencyList[from];

    for (const to of toSet) {
      dag.addEdge(from, to);
    }
  }

  const ts = new TopologicalSort(dag);
  const order = ts.order();

  return order;
}
