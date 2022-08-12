import { VertexDescriptor } from "../types/graph";
import { isFuture } from "../types/guards";
import { IRecipeGraph, RecipeVertex } from "../types/recipeGraph";

export class RecipeGraph implements IRecipeGraph {
  public nodes: Map<number, VertexDescriptor>;
  public edges: Array<{ from: number; to: number }>;
  private deps: Map<number, RecipeVertex>;

  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.deps = new Map();
  }

  public size(): number {
    return this.nodes.size;
  }

  public getDepNodeByLabel(label: string): RecipeVertex | undefined {
    const node = Array.from(this.nodes.values()).find((n) => n.label === label);

    return node !== undefined ? this.deps.get(node.id) : undefined;
  }

  public getDepNodeById(id: number): RecipeVertex | undefined {
    return this.deps.get(id);
  }

  public addDepNode(depNode: RecipeVertex) {
    this.nodes.set(depNode.id, { id: depNode.id, label: depNode.label });
    this.deps.set(depNode.id, depNode);

    if (depNode.type !== "DeployedContract") {
      const futureArgs = depNode.args.filter(isFuture);

      for (const arg of futureArgs) {
        this.edges.push({ from: arg.id, to: depNode.id });
      }
    }

    if (
      depNode.type === "HardhatContract" ||
      depNode.type === "ArtifactContract"
    ) {
      const futureLibraries = Object.values(depNode.libraries);

      for (const lib of futureLibraries) {
        this.edges.push({ from: lib.id, to: depNode.id });
      }
    }

    if (depNode.type === "Call") {
      this.edges.push({ from: depNode.contract, to: depNode.id });
    }
  }

  public getDependenciesFor({ id }: { id: number }): VertexDescriptor[] {
    const depIds = this.edges
      .filter((edge) => edge.to === id)
      .map((edge) => edge.from);

    return depIds
      .map((depId) => this.nodes.get(depId))
      .filter(
        (nodeDesc): nodeDesc is VertexDescriptor => nodeDesc !== undefined
      );
  }
}
