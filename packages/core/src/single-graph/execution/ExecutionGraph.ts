import { ExecutionVertex, IExecutionGraph } from "../types/executionGraph";
import {
  AdjacencyList,
  constructEmptyAdjacencyList,
} from "../utils/adjacencyList";

export class ExecutionGraph implements IExecutionGraph {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, ExecutionVertex>;

  constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, ExecutionVertex>();
  }
}
