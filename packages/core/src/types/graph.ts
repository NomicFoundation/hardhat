export interface VertexDescriptor {
  id: number;
  label: string;
}

export type AdjacencyList = Map<number, Set<number>>;

export interface IGraph<T> {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, T>;
  getEdges(): Array<{ from: number; to: number }>;
}

export type VertexGraph = IGraph<VertexDescriptor>;

export interface VertexVisitResultSuccess {
  _kind: "success";
  result: any;
}

export interface VertexVisitResultFailure {
  _kind: "failure";
  failure: Error;
}

export type VertexVisitResult =
  | VertexVisitResultSuccess
  | VertexVisitResultFailure;

export type VisitResult =
  | {
      _kind: "success";
      result: ResultsAccumulator;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    };

export type ResultsAccumulator = Map<number, VertexVisitResult | null>;
