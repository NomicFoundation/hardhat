import { AdjacencyList, IGraph } from "../types/graph";

import { constructEmptyAdjacencyList } from "./adjacencyList";

export class Graph<T> implements IGraph<T> {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, T>;

  constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, T>();
  }
}
