import { Services } from "services/types";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { RecipeVertex } from "types/recipeGraph";

import { validateArtifactContract } from "./validateArtifactContract";
import { validateArtifactLibrary } from "./validateArtifactLibrary";
import { validateCall } from "./validateCall";
import { validateDeployedContract } from "./validateDeployedContract";
import { validateHardhatContract } from "./validateHardhatContract";
import { validateHardhatLibrary } from "./validateHardhatLibrary";
import { validateVirtual } from "./validateVirtual";

export function validationDispatch(
  recipeVertex: RecipeVertex,
  resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
  switch (recipeVertex.type) {
    case "ArtifactContract":
      return validateArtifactContract(recipeVertex, resultAccumulator, context);
    case "ArtifactLibrary":
      return validateArtifactLibrary(recipeVertex, resultAccumulator, context);
    case "DeployedContract":
      return validateDeployedContract(recipeVertex, resultAccumulator, context);
    case "Call":
      return validateCall(recipeVertex, resultAccumulator, context);
    case "HardhatLibrary":
      return validateHardhatLibrary(recipeVertex, resultAccumulator, context);
    case "HardhatContract":
      return validateHardhatContract(recipeVertex, resultAccumulator, context);
    case "Virtual":
      return validateVirtual(recipeVertex, resultAccumulator, context);
    default:
      return assertUnknownRecipeVertexType(recipeVertex);
  }
}

function assertUnknownRecipeVertexType(
  recipeVertex: never
): Promise<VertexVisitResult> {
  const vertex = recipeVertex as any;

  const forReport = "type" in vertex ? vertex.type : vertex;

  throw new Error(`Unknown recipe vertex type: ${forReport}`);
}
