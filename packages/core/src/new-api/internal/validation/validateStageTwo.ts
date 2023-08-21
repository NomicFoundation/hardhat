import { ArtifactResolver } from "../../types/artifact";
import { DeploymentParameters } from "../../types/deployer";
import { FutureType, IgnitionModule } from "../../types/module";
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

export async function validateStageTwo(
  module: IgnitionModule,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<void> {
  const futures = getFuturesFromModule(module);

  // originally, I wrote a getSubmodulesFromModule function similar to the one above
  // that recursively retrieved all submodules regardless of how deeply nested they were.
  // however, by taking only the top level submodules of the current depth and recursively
  // validating each of those, we achieve the same effect.
  const submodules = module.submodules;
  for (const submodule of submodules) {
    await validateStageTwo(
      submodule,
      artifactLoader,
      deploymentParameters,
      accounts
    );
  }

  for (const future of futures) {
    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        await validateArtifactContractDeployment(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        await validateArtifactLibraryDeployment(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.ARTIFACT_CONTRACT_AT:
        await validateArtifactContractAt(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        await validateNamedContractDeployment(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        await validateNamedLibraryDeployment(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.NAMED_CONTRACT_AT:
        await validateNamedContractAt(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.NAMED_CONTRACT_CALL:
        await validateNamedContractCall(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.NAMED_STATIC_CALL:
        await validateNamedStaticCall(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.READ_EVENT_ARGUMENT:
        await validateReadEventArgument(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
      case FutureType.SEND_DATA:
        await validateSendData(
          future,
          artifactLoader,
          deploymentParameters,
          accounts
        );
        break;
    }
  }
}
