import { Graph } from "../graph/Graph";
import { getEdges } from "../graph/adjacencyList";
import { ExecutionVertex } from "../types/executionGraph";

export class ExecutionGraph extends Graph<ExecutionVertex> {
  public toMermaid(): string {
    const vertexes = [...this.vertexes.values()]
      .map((v) => `e${v.id}[${v.label}]`)
      .join("\n");

    const edges = getEdges(this.adjacencyList)
      .map(({ from, to }) => `e${from} --> e${to}`)
      .join("\n");

    return `flowchart TD\n${vertexes}\n${edges}`;
  }
}
