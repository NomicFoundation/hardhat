import { Artifact, BuildInfo } from "./artifact";
import { Journal } from "./journal";

/**
 * Read and write to the deployment storage.
 *
 * @beta
 */
export interface DeploymentLoader {
  journal: Journal;
  initialize(): Promise<void>;
  loadArtifact(storedArtifactPath: string): Promise<Artifact>;
  storeArtifact(futureId: string, artifact: Artifact): Promise<string>;
  storeBuildInfo(buildInfo: BuildInfo): Promise<string>;
  recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void>;
}
