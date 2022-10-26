import type { FutureDict } from "types/future";
import type { IRecipeGraphBuilder, Subgraph } from "types/recipeGraph";

export function buildSubgraph(
  subgraphName: string,
  subgraphAction: (m: IRecipeGraphBuilder) => FutureDict
): Subgraph {
  return {
    name: subgraphName,
    subgraphAction,
  };
}
