export interface VertexDescriptor {
  id: number;
  label: string;
}

export type AdjacencyList = Map<number, Set<number>>;

export interface IGraph<T> {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, T>;
}
