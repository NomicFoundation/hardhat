import type {
  Artifact,
  ArtifactResolver,
  BuildInfo,
} from "@nomicfoundation/ignition-core";
import type { ArtifactManager } from "hardhat/types/artifacts";

import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";

export class HardhatArtifactResolver implements ArtifactResolver {
  readonly #artifactManager: ArtifactManager;

  constructor(artifactManager: ArtifactManager) {
    this.#artifactManager = artifactManager;
  }

  public async getBuildInfo(
    contractName: string,
  ): Promise<BuildInfo | undefined> {
    const buildInfoId =
      await this.#artifactManager.getBuildInfoId(contractName);

    if (buildInfoId === undefined) {
      return undefined;
    }

    const buildInfoPath =
      await this.#artifactManager.getBuildInfoPath(buildInfoId);

    if (buildInfoPath === undefined) {
      return undefined;
    }

    return readJsonFile<BuildInfo>(buildInfoPath);
  }

  public loadArtifact(contractName: string): Promise<Artifact> {
    return this.#artifactManager.readArtifact(contractName);
  }
}
