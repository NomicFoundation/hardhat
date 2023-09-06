import { IgnitionValidationError } from "../../errors";
import { ArtifactResolver } from "../../types/artifact";
import {
  DeploymentResultType,
  ValidationErrorDeploymentResult,
} from "../../types/deploy";
import { Future, FutureType, IgnitionModule } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { validateArtifactContractAt } from "./stageOne/validateArtifactContractAt";
import { validateArtifactContractDeployment } from "./stageOne/validateArtifactContractDeployment";
import { validateArtifactLibraryDeployment } from "./stageOne/validateArtifactLibraryDeployment";
import { validateNamedContractAt } from "./stageOne/validateNamedContractAt";
import { validateNamedContractCall } from "./stageOne/validateNamedContractCall";
import { validateNamedContractDeployment } from "./stageOne/validateNamedContractDeployment";
import { validateNamedLibraryDeployment } from "./stageOne/validateNamedLibraryDeployment";
import { validateNamedStaticCall } from "./stageOne/validateNamedStaticCall";
import { validateReadEventArgument } from "./stageOne/validateReadEventArgument";
import { validateSendData } from "./stageOne/validateSendData";

export async function validateStageOne(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver
): Promise<ValidationErrorDeploymentResult | null> {
  const futures = getFuturesFromModule(module);

  for (const future of futures) {
    try {
      await _validateFuture(future, artifactLoader);
    } catch (err) {
      assertIgnitionInvariant(
        err instanceof IgnitionValidationError,
        `Expected an IgnitionValidationError when validating the future ${future.id}`
      );

      return {
        type: DeploymentResultType.VALIDATION_ERROR,
        errors: {
          [future.id]: [err.message],
        },
      };
    }
  }

  // No validation errors
  return null;
}

async function _validateFuture(
  future: Future,
  artifactLoader: ArtifactResolver
): Promise<void> {
  switch (future.type) {
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
      await validateArtifactContractDeployment(future, artifactLoader);
      break;
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
      await validateArtifactLibraryDeployment(future, artifactLoader);
      break;
    case FutureType.ARTIFACT_CONTRACT_AT:
      await validateArtifactContractAt(future, artifactLoader);
      break;
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
      await validateNamedContractDeployment(future, artifactLoader);
      break;
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
      await validateNamedLibraryDeployment(future, artifactLoader);
      break;
    case FutureType.NAMED_CONTRACT_AT:
      await validateNamedContractAt(future, artifactLoader);
      break;
    case FutureType.NAMED_CONTRACT_CALL:
      await validateNamedContractCall(future, artifactLoader);
      break;
    case FutureType.NAMED_STATIC_CALL:
      await validateNamedStaticCall(future, artifactLoader);
      break;
    case FutureType.READ_EVENT_ARGUMENT:
      await validateReadEventArgument(future, artifactLoader);
      break;
    case FutureType.SEND_DATA:
      await validateSendData(future, artifactLoader);
      break;
  }
}
