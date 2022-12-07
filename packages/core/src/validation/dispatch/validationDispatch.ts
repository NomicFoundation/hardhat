import { Services } from "services/types";
import { DeploymentGraphVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

import { validateArtifactContract } from "./validateArtifactContract";
import { validateArtifactLibrary } from "./validateArtifactLibrary";
import { validateAwaitEvent } from "./validateAwaitEvent";
import { validateCall } from "./validateCall";
import { validateDeployedContract } from "./validateDeployedContract";
import { validateHardhatContract } from "./validateHardhatContract";
import { validateHardhatLibrary } from "./validateHardhatLibrary";
import { validateVirtual } from "./validateVirtual";

export function validationDispatch(
  deploymentVertex: DeploymentGraphVertex,
  resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
  switch (deploymentVertex.type) {
    case "ArtifactContract":
      return validateArtifactContract(
        deploymentVertex,
        resultAccumulator,
        context
      );
    case "ArtifactLibrary":
      return validateArtifactLibrary(
        deploymentVertex,
        resultAccumulator,
        context
      );
    case "DeployedContract":
      return validateDeployedContract(
        deploymentVertex,
        resultAccumulator,
        context
      );
    case "Call":
      return validateCall(deploymentVertex, resultAccumulator, context);
    case "HardhatLibrary":
      return validateHardhatLibrary(
        deploymentVertex,
        resultAccumulator,
        context
      );
    case "HardhatContract":
      return validateHardhatContract(
        deploymentVertex,
        resultAccumulator,
        context
      );
    case "Virtual":
      return validateVirtual(deploymentVertex, resultAccumulator, context);
    case "Event":
      return validateAwaitEvent(deploymentVertex, resultAccumulator, context);
    default:
      return assertUnknownDeploymentVertexType(deploymentVertex);
  }
}

function assertUnknownDeploymentVertexType(
  deploymentVertex: never
): Promise<VertexVisitResult> {
  const vertex = deploymentVertex as any;

  const forReport = "type" in vertex ? vertex.type : vertex;

  throw new Error(`Unknown deployment vertex type: ${forReport}`);
}
