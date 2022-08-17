import { VertexDescriptor } from "../types/graph";
import { isFuture } from "../types/guards";
import { IRecipeGraph, RecipeVertex } from "../types/recipeGraph";
import {
  addEdge,
  AdjacencyList,
  constructEmptyAdjacencyList,
  getDependenciesFor,
} from "../utils/adjacencyList";

export class RecipeGraph implements IRecipeGraph {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, RecipeVertex>;

  constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, RecipeVertex>();
  }

  public vertexSize(): number {
    return this.vertexes.size;
  }

  public getRecipeVertexByLabel(label: string): RecipeVertex | undefined {
    return Array.from(this.vertexes.values()).find((n) => n.label === label);
  }

  public getRecipeVertexById(id: number): RecipeVertex | undefined {
    return this.vertexes.get(id);
  }

  public addRecipeVertex(depNode: RecipeVertex) {
    this.vertexes.set(depNode.id, depNode);

    if (depNode.type !== "DeployedContract") {
      const futureArgs = depNode.args.filter(isFuture);

      for (const arg of futureArgs) {
        addEdge(this.adjacencyList, { from: arg.id, to: depNode.id });
      }
    }

    if (
      depNode.type === "HardhatContract" ||
      depNode.type === "ArtifactContract"
    ) {
      const futureLibraries = Object.values(depNode.libraries);

      for (const lib of futureLibraries) {
        addEdge(this.adjacencyList, { from: lib.id, to: depNode.id });
      }
    }

    if (depNode.type === "Call") {
      addEdge(this.adjacencyList, {
        from: depNode.contract.id,
        to: depNode.id,
      });
    }
  }

  public getDependenciesForVertex({ id }: { id: number }): VertexDescriptor[] {
    const depIds = getDependenciesFor(this.adjacencyList, id);

    return depIds
      .map((depId) => this.vertexes.get(depId))
      .filter((nodeDesc): nodeDesc is RecipeVertex => nodeDesc !== undefined)
      .map((vertex) => ({ id: vertex.id, label: vertex.label }));
  }
}
