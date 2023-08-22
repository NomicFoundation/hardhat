import { ArtifactResolver } from "../../types/artifact";
import { FutureType, IgnitionModule } from "../../types/module";
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
): Promise<void> {
  const futures = getFuturesFromModule(module);

  // originally, I wrote a getSubmodulesFromModule function similar to the one above
  // that recursively retrieved all submodules regardless of how deeply nested they were.
  // however, by taking only the top level submodules of the current depth and recursively
  // validating each of those, we achieve the same effect.
  const submodules = module.submodules;
  for (const submodule of submodules) {
    await validateStageOne(submodule, artifactLoader);
  }

  for (const future of futures) {
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
}
