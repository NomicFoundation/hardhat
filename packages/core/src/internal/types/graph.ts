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

export enum VertexResultEnum {
  SUCCESS = "success",
  FAILURE = "failure",
  HOLD = "hold",
}

export interface VertexVisitResultSuccess<T> {
  _kind: VertexResultEnum.SUCCESS;
  result: T;
}

export interface VertexVisitResultFailure {
  _kind: VertexResultEnum.FAILURE;
  failure: Error;
}

export interface VertexVisitResultHold {
  _kind: VertexResultEnum.HOLD;
}

export type VertexVisitResult<T> =
  | VertexVisitResultSuccess<T>
  | VertexVisitResultFailure
  | VertexVisitResultHold;

export type VisitResult<T> =
  | {
      _kind: "success";
      result: ResultsAccumulator<T>;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    }
  | {
      _kind: "hold";
      holds: VertexDescriptor[];
    };

export type ResultsAccumulator<T> = Map<
  number,
  VertexVisitResult<T> | undefined
>;
