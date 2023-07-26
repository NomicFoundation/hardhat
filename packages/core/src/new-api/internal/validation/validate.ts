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

  for (const future of futures) {
    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        await validateArtifactContractDeployment(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        await validateArtifactLibraryDeployment(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.ARTIFACT_CONTRACT_AT:
        await validateArtifactContractAt(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        await validateNamedContractDeployment(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        await validateNamedLibraryDeployment(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.NAMED_CONTRACT_AT:
        await validateNamedContractAt(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.NAMED_CONTRACT_CALL:
        await validateNamedContractCall(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.NAMED_STATIC_CALL:
        await validateNamedStaticCall(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.READ_EVENT_ARGUMENT:
        await validateReadEventArgument(
          future,
          artifactLoader,
          deploymentParameters
        );
        break;
      case FutureType.SEND_DATA:
        await validateSendData(future, artifactLoader, deploymentParameters);
        break;
    }
  }
}
