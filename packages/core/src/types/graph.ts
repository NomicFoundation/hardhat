export interface VertexDescriptor {
  id: number;
  label: string;
  type: string;
  args?: any[];
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

export interface VertexVisitResultHold {
  _kind: "hold";
}

export type VertexVisitResult =
  | VertexVisitResultSuccess
  | VertexVisitResultFailure
  | VertexVisitResultHold;

export type VisitResult =
  | {
      _kind: "success";
      result: ResultsAccumulator;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    }
  | {
      _kind: "hold";
      holds: VertexDescriptor[];
    };

export type ResultsAccumulator = Map<number, VertexVisitResult | null>;
