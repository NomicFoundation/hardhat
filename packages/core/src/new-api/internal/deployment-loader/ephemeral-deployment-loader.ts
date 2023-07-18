import fs from "fs";

import { Artifact, ArtifactResolver, BuildInfo } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import { Journal } from "../../types/journal";
import { MemoryJournal } from "../journal/memory-journal";

/**
 * Stores and loads deployment related information without making changes
 * on disk, by either storing in memory or loading already existing files.
 * Used when running in environments like Hardhat tests.
 */
export class EphemeralDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _deployedAddresses: { [key: string]: string };

  constructor(
    private _artifactResolver: ArtifactResolver,
    private _verbose: boolean
  ) {
    this.journal = new MemoryJournal(this._verbose);
    this._deployedAddresses = {};
  }

  public async loadArtifact(storedArtifactPath: string): Promise<Artifact> {
    const json = await fs.promises.readFile(storedArtifactPath);

    const artifact = JSON.parse(json.toString());

    return artifact;
  }

  public async recordDeployedAddress(
    futureId: string,
    contractAddress: string
  ): Promise<void> {
    this._deployedAddresses[futureId] = contractAddress;
  }

  public async storeArtifact(
    _futureId: string,
    artifact: Artifact
  ): Promise<string> {
    const artifactPath = await this._artifactResolver.resolvePath(
      artifact.contractName
    );

    if (artifactPath === undefined) {
      throw new Error(`Artifact path not found for ${artifact.contractName}`);
    }

    return artifactPath;
  }

  public async storeBuildInfo(buildInfo: BuildInfo): Promise<string> {
    const id = buildInfo.id;

    return `${id}.json`;
  }
}
