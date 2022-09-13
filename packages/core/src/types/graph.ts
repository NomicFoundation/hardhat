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

export type VertexVisitResult =
  | {
      _kind: "success";
      result: any;
    }
  | {
      _kind: "failure";
      failure: Error;
    };

export type VisitResult =
  | {
      _kind: "success";
      result: Map<number, any>;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    };
