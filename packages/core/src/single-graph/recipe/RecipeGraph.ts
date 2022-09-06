import { Graph } from "../graph/Graph";
import { getEdges } from "../graph/adjacencyList";
import { RecipeFuture } from "../types/future";
import { RecipeVertex } from "../types/recipeGraph";

export class RecipeGraph extends Graph<RecipeVertex> {
  public registeredParameters: {
    [key: string]: { [key: string]: string | number | RecipeFuture };
  };

  constructor() {
    super();

    this.registeredParameters = {};
  }

  public toMermaid(): string {
    const vertexes = [...this.vertexes.values()]
      .map((v) => `r${v.id}[${v.label}]`)
      .join("\n");

    const edges = getEdges(this.adjacencyList)
      .map(({ from, to }) => `r${from} --> r${to}`)
      .join("\n");

    return `flowchart TD\n${vertexes}\n${edges}`;
  }
}
