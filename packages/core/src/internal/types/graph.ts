/**
 * An abstraction for representing the edges of a graph,
 * where a from vertex id is matched to a set of linked
 * to vertexes.
 *
 * @internal
 */
export type AdjacencyList = Map<number, Set<number>>;

/**
 * An adjacency list based graph.
 *
 * @internal
 */
export interface IGraph<T> {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, T>;
  getEdges(): Array<{ from: number; to: number }>;
}

/**
 * An Ignition on-chain action as part of a depedency graph.
 *
 * @internal
 */
export interface VertexDescriptor {
  id: number;
  label: string;
  type: string;
  args?: any[];
}

/**
 * A graph of Ignition on-chain actions.
 *
 * @internal
 */
export type VertexGraph = IGraph<VertexDescriptor>;

/**
 * The different possibilities of processing a dependency graph vertex.
 *
 * @internal
 */
export enum VertexResultEnum {
  SUCCESS = "success",
  FAILURE = "failure",
  HOLD = "hold",
}

/**
 * The result of performing the vertex actioni succeeded with the result.
 *
 * @internal
 */
export interface VertexVisitResultSuccess<T> {
  _kind: VertexResultEnum.SUCCESS;
  result: T;
}

/**
 * The result of performing the vertex action failed with the given error.
 *
 * @internal
 */
export interface VertexVisitResultFailure {
  _kind: VertexResultEnum.FAILURE;
  failure: Error;
}

/**
 * The result of performing the vertex action either timed out or did not
 * meet the test condition.
 *
 * @internal
 */
export interface VertexVisitResultHold {
  _kind: VertexResultEnum.HOLD;
}

/**
 * The result of processing a vertex in the dependency graph, either a
 * success, failure or on hold.
 *
 * @internal
 */
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
