import { Services } from "services/types";
import { DeploymentGraphVertex } from "types/deploymentGraph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { assertUnknownDeploymentVertexType } from "utils/guards";

import { validateArtifactContract } from "./validateArtifactContract";
import { validateArtifactLibrary } from "./validateArtifactLibrary";
import { validateCall } from "./validateCall";
import { validateDeployedContract } from "./validateDeployedContract";
import { validateEvent } from "./validateEvent";
import { validateHardhatContract } from "./validateHardhatContract";
import { validateHardhatLibrary } from "./validateHardhatLibrary";
import { validateSendETH } from "./validateSendETH";
import { validateVirtual } from "./validateVirtual";

export function validationDispatch(
  deploymentVertex: DeploymentGraphVertex,
  resultAccumulator: ValidationResultsAccumulator,
  context: { services: Services }
): Promise<ValidationVertexVisitResult> {
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
      return validateEvent(deploymentVertex, resultAccumulator, context);
    case "SendETH":
      return validateSendETH(deploymentVertex, resultAccumulator);
    default:
      assertUnknownDeploymentVertexType(deploymentVertex);
  }
}
