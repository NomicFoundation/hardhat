import { RecipeFuture } from "../types/future";
import { IRecipeGraph, RecipeVertex } from "../types/recipeGraph";
import {
  AdjacencyList,
  constructEmptyAdjacencyList,
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
}
