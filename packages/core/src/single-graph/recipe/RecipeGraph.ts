import { RecipeFuture } from "../types/future";
import { VertexDescriptor } from "../types/graph";
import { isDependable } from "../types/guards";
import { IRecipeGraph, RecipeVertex } from "../types/recipeGraph";
import {
  addEdge,
  AdjacencyList,
  constructEmptyAdjacencyList,
  ensureVertex,
  getDependenciesFor,
} from "../utils/adjacencyList";

export class RecipeGraph implements IRecipeGraph {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, RecipeVertex>;
  public registeredParameters: {
    [key: string]: { [key: string]: string | number | RecipeFuture };
  };

  constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, RecipeVertex>();
    this.registeredParameters = {};
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
    ensureVertex(this.adjacencyList, depNode.id);

    if (depNode.type !== "DeployedContract" && depNode.type !== "Virtual") {
      const futureArgs = depNode.args.filter(isDependable);

      for (const arg of futureArgs) {
        addEdge(this.adjacencyList, { from: arg.vertexId, to: depNode.id });
      }
    }

    if (
      depNode.type === "HardhatContract" ||
      depNode.type === "ArtifactContract"
    ) {
      const futureLibraries = Object.values(depNode.libraries).filter(
        isDependable
      );

      for (const lib of futureLibraries) {
        addEdge(this.adjacencyList, { from: lib.vertexId, to: depNode.id });
      }
    }

    if (depNode.type === "Call") {
      addEdge(this.adjacencyList, {
        from: depNode.contract.vertexId,
        to: depNode.id,
      });

      for (const afterVertex of depNode.after.filter(isDependable)) {
        addEdge(this.adjacencyList, {
          from: afterVertex.vertexId,
          to: depNode.id,
        });
      }
    }

    if (depNode.type === "Virtual") {
      for (const afterVertex of depNode.after.filter(isDependable)) {
        addEdge(this.adjacencyList, {
          from: afterVertex.vertexId,
          to: depNode.id,
        });
      }
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
