import { Services } from "services/types";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { RecipeVertex } from "types/recipeGraph";

export async function validateVirtual(
  _recipeVertex: RecipeVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  return {
    _kind: "success",
    result: undefined,
  };
}
