import { getSortedVertexIdsFrom } from "graph/utils";
import { visit } from "graph/visit";
import { Services } from "services/types";
import { VertexVisitResult, VisitResult } from "types/graph";
import { IRecipeGraph } from "types/recipeGraph";

import { validationDispatch } from "./dispatch/validationDispatch";

export function validateRecipeGraph(
  recipeGraph: IRecipeGraph,
  services: Services
): Promise<VisitResult> {
  const orderedVertexIds = getSortedVertexIdsFrom(recipeGraph);

  return visit(
    "Validation",
    orderedVertexIds,
    recipeGraph,
    { services },
    new Map<number, VertexVisitResult | null>(),
    validationDispatch
  );
}
