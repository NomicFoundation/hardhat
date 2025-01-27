import type { ArtifactResolver } from "../../types/artifact.js";
import type {
  DeploymentParameters,
  ValidationErrorDeploymentResult,
} from "../../types/deploy.js";
import type { Future, IgnitionModule } from "../../types/module.js";

import { DeploymentResultType } from "../../types/deploy.js";
import { FutureType } from "../../types/module.js";
import { getFuturesFromModule } from "../utils/get-futures-from-module.js";

import { validateArtifactContractAt } from "./futures/validateArtifactContractAt.js";
import { validateArtifactContractDeployment } from "./futures/validateArtifactContractDeployment.js";
import { validateArtifactLibraryDeployment } from "./futures/validateArtifactLibraryDeployment.js";
import { validateNamedContractAt } from "./futures/validateNamedContractAt.js";
import { validateNamedContractCall } from "./futures/validateNamedContractCall.js";
import { validateNamedContractDeployment } from "./futures/validateNamedContractDeployment.js";
import { validateNamedEncodeFunctionCall } from "./futures/validateNamedEncodeFunctionCall.js";
import { validateNamedLibraryDeployment } from "./futures/validateNamedLibraryDeployment.js";
import { validateNamedStaticCall } from "./futures/validateNamedStaticCall.js";
import { validateReadEventArgument } from "./futures/validateReadEventArgument.js";
import { validateSendData } from "./futures/validateSendData.js";

export async function validate(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<ValidationErrorDeploymentResult | null> {
  const futures = getFuturesFromModule(module);

  const errors: ValidationErrorDeploymentResult["errors"] = {};

  for (const future of futures) {
    const validationErrors = await _validateFuture(
      future,
      artifactLoader,
      deploymentParameters,
      accounts,
    );

    if (validationErrors.length > 0) {
      errors[future.id] = validationErrors;
    }
  }

  if (Object.keys(errors).length === 0) {
    // No validation errors
    return null;
  }

  return {
    type: DeploymentResultType.VALIDATION_ERROR,
    errors,
  };
}

async function _validateFuture(
  future: Future,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[],
): Promise<string[]> {
  switch (future.type) {
    case FutureType.CONTRACT_DEPLOYMENT:
      return validateArtifactContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.LIBRARY_DEPLOYMENT:
      return validateArtifactLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.CONTRACT_AT:
      return validateArtifactContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      return validateNamedContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      return validateNamedLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return validateNamedContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.CONTRACT_CALL:
      return validateNamedContractCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.STATIC_CALL:
      return validateNamedStaticCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.ENCODE_FUNCTION_CALL:
      return validateNamedEncodeFunctionCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.READ_EVENT_ARGUMENT:
      return validateReadEventArgument(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
    case FutureType.SEND_DATA:
      return validateSendData(
        future,
        artifactLoader,
        deploymentParameters,
        accounts,
      );
  }
}
