import { AdjacencyList, IGraph } from "../types/graph";

import { constructEmptyAdjacencyList } from "./adjacencyList";

export class Graph<T> implements IGraph<T> {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, T>;

  constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, T>();
  }

  public getEdges() {
    const edges: Array<{ from: number; to: number }> = [];

    for (const [from, edgeList] of this.adjacencyList.entries()) {
      for (const to of edgeList.values()) {
        edges.push({ from, to });
      }
    }

    return edges;
  }
}
