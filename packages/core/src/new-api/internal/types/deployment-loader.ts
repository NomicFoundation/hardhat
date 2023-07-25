import { Artifact, BuildInfo } from "../../types/artifact";

import { JournalableMessage } from "./journal";

/**
 * Read and write to the deployment storage.
 *
 * @beta
 */
export interface DeploymentLoader {
  recordToJournal(message: JournalableMessage): Promise<void>;
  readFromJournal(): AsyncGenerator<JournalableMessage>;
  loadArtifact(artifactFutureId: string): Promise<Artifact>;
  storeUserProvidedArtifact(
    futureId: string,
    artifact: Artifact
  ): Promise<void>;
  storeNamedArtifact(
    futureId: string,
    contractName: string,
    artifact: Artifact
  ): Promise<void>;
  storeBuildInfo(buildInfo: BuildInfo): Promise<void>;
  recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void>;
}
