import { ArtifactResolver } from "../../types/artifact";
import {
  DeploymentParameters,
  DeploymentResultType,
  ValidationErrorDeploymentResult,
} from "../../types/deploy";
import { Future, FutureType, IgnitionModule } from "../../types/module";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { validateArtifactContractAt } from "./stageTwo/validateArtifactContractAt";
import { validateArtifactContractDeployment } from "./stageTwo/validateArtifactContractDeployment";
import { validateArtifactLibraryDeployment } from "./stageTwo/validateArtifactLibraryDeployment";
import { validateNamedContractAt } from "./stageTwo/validateNamedContractAt";
import { validateNamedContractCall } from "./stageTwo/validateNamedContractCall";
import { validateNamedContractDeployment } from "./stageTwo/validateNamedContractDeployment";
import { validateNamedLibraryDeployment } from "./stageTwo/validateNamedLibraryDeployment";
import { validateNamedStaticCall } from "./stageTwo/validateNamedStaticCall";
import { validateReadEventArgument } from "./stageTwo/validateReadEventArgument";
import { validateSendData } from "./stageTwo/validateSendData";

export async function validate(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<ValidationErrorDeploymentResult | null> {
  const futures = getFuturesFromModule(module);

  const errors: ValidationErrorDeploymentResult["errors"] = {};

  for (const future of futures) {
    const validationErrors = await _validateFuture(
      future,
      artifactLoader,
      deploymentParameters,
      accounts
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
  accounts: string[]
): Promise<string[]> {
  switch (future.type) {
    case FutureType.CONTRACT_DEPLOYMENT:
      return validateArtifactContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.LIBRARY_DEPLOYMENT:
      return validateArtifactLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.CONTRACT_AT:
      return validateArtifactContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      return validateNamedContractDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      return validateNamedLibraryDeployment(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
      return validateNamedContractAt(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.CONTRACT_CALL:
      return validateNamedContractCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.STATIC_CALL:
      return validateNamedStaticCall(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.READ_EVENT_ARGUMENT:
      return validateReadEventArgument(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
    case FutureType.SEND_DATA:
      return validateSendData(
        future,
        artifactLoader,
        deploymentParameters,
        accounts
      );
  }
}
