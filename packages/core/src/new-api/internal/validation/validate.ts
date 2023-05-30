import { ArtifactResolver } from "../../types/artifact";
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
  artifactLoader: ArtifactResolver
): Promise<void> {
  const futures = getFuturesFromModule(module);

  for (const future of futures) {
    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        return validateArtifactContractDeployment(future, artifactLoader);
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        return validateArtifactLibraryDeployment(future, artifactLoader);
      case FutureType.ARTIFACT_CONTRACT_AT:
        return validateArtifactContractAt(future, artifactLoader);
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        return validateNamedContractDeployment(future, artifactLoader);
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        return validateNamedLibraryDeployment(future, artifactLoader);
      case FutureType.NAMED_CONTRACT_AT:
        return validateNamedContractAt(future, artifactLoader);
      case FutureType.NAMED_CONTRACT_CALL:
        return validateNamedContractCall(future, artifactLoader);
      case FutureType.NAMED_STATIC_CALL:
        return validateNamedStaticCall(future, artifactLoader);
      case FutureType.READ_EVENT_ARGUMENT:
        return validateReadEventArgument(future, artifactLoader);
      case FutureType.SEND_DATA:
        return validateSendData(future, artifactLoader);
    }
  }
}
