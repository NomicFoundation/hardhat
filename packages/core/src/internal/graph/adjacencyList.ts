import { DiGraph, TopologicalSort } from "js-graph-algorithms";

import { AdjacencyList } from "../types/graph";
import { IgnitionError } from "../utils/errors";

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

export function ensureVertex(adjacencyList: AdjacencyList, v: number) {
  const toSet = adjacencyList.get(v) ?? new Set<number>();

  adjacencyList.set(v, toSet);
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
  const order = ts.order().filter((elem) => vertexes.has(elem));

  return order;
}

/**
 * Remove a vertex, transfering its dependencies to its dependents.
 * @param adjacencyList the adjacency list
 * @param v the vertex to eliminate
 * @returns an adjacency list without the vertex
 */
export function eliminate(
  adjacencyList: AdjacencyList,
  v: number
): AdjacencyList {
  const updatedList = clone(adjacencyList);

  const dependencies = getDependenciesFor(updatedList, v);
  const dependents = updatedList.get(v) ?? new Set<number>();

  updatedList.delete(v);

  for (const dependency of dependencies) {
    const toSet = updatedList.get(dependency);

    if (toSet === undefined) {
      throw new IgnitionError("Dependency sets should be defined");
    }

    const setWithoutV = new Set<number>([...toSet].filter((n) => n !== v));

    const updatedSet = new Set<number>([...setWithoutV, ...dependents]);

    updatedList.set(dependency, updatedSet);
  }

  return updatedList;
}
