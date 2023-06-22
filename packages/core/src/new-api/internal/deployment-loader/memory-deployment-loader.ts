import fs from "fs";

import { Artifact, ArtifactResolver, BuildInfo } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import { Journal } from "../../types/journal";
import { MemoryJournal } from "../journal/memory-journal";

export class MemoryDeploymentLoader implements DeploymentLoader {
  public journal: Journal;

  private _deployedAddresses: { [key: string]: string };

  constructor(private _artifactResolver: ArtifactResolver) {
    this.journal = new MemoryJournal();
    this._deployedAddresses = {};
  }

  public async loadArtifact(storedArtifactPath: string): Promise<Artifact> {
    const json = await fs.promises.readFile(storedArtifactPath);

    const artifact = JSON.parse(json.toString());

    return artifact;
  }

  public async initialize(): Promise<void> {}

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
