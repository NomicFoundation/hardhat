import { ArtifactResolver } from "../../types/artifact";
import { DeploymentParameters } from "../../types/deployer";
import { FutureType, IgnitionModule } from "../../types/module";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { validateArtifactContractAt } from "./futures/validateArtifactContractAt";
import { validateArtifactContractDeployment } from "./futures/validateArtifactContractDeployment";
import { validateArtifactLibraryDeployment } from "./futures/validateArtifactLibraryDeployment";
import { validateNamedContractAt } from "./futures/validateNamedContractAt";
import { validateNamedContractCall } from "./futures/validateNamedContractCall";
import { validateNamedContractDeployment } from "./futures/validateNamedContractDeployment";
import { validateNamedLibraryDeployment } from "./futures/validateNamedLibraryDeployment";
import { validateNamedStaticCall } from "./futures/validateNamedStaticCall";
import { validateReadEventArgument } from "./futures/validateReadEventArgument";
import { validateSendData } from "./futures/validateSendData";

export async function validate(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters
): Promise<void> {
  const futures = getFuturesFromModule(module);

  // originally, I wrote a getSubmodulesFromModule function similar to the one above
  // that recursively retrieved all submodules regardless of how deeply nested they were.
  // however, by taking only the top level submodules of the current depth and recursively
  // validating each of those, we achieve the same effect.
  const submodules = module.submodules;
  for (const submodule of submodules) {
    await validate(submodule, artifactLoader, deploymentParameters);
  }

  const params = deploymentParameters[module.id] ?? {};

  for (const future of futures) {
    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        return validateArtifactContractDeployment(
          future,
          artifactLoader,
          params
        );
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        return validateArtifactLibraryDeployment(
          future,
          artifactLoader,
          params
        );
      case FutureType.ARTIFACT_CONTRACT_AT:
        return validateArtifactContractAt(future, artifactLoader, params);
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        return validateNamedContractDeployment(future, artifactLoader, params);
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        return validateNamedLibraryDeployment(future, artifactLoader, params);
      case FutureType.NAMED_CONTRACT_AT:
        return validateNamedContractAt(future, artifactLoader, params);
      case FutureType.NAMED_CONTRACT_CALL:
        return validateNamedContractCall(future, artifactLoader, params);
      case FutureType.NAMED_STATIC_CALL:
        return validateNamedStaticCall(future, artifactLoader, params);
      case FutureType.READ_EVENT_ARGUMENT:
        return validateReadEventArgument(future, artifactLoader, params);
      case FutureType.SEND_DATA:
        return validateSendData(future, artifactLoader, params);
    }
  }
}
