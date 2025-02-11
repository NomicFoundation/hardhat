import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type {
  Artifact,
  ArtifactResolver,
  BuildInfo,
} from "@ignored/hardhat-vnext-ignition-core";

import { readJsonFile } from "@ignored/hardhat-vnext-utils/fs";

export class HardhatArtifactResolver implements ArtifactResolver {
  readonly #hre: HardhatRuntimeEnvironment;

  constructor(_hre: HardhatRuntimeEnvironment) {
    this.#hre = _hre;
  }

  public async getBuildInfo(
    contractName: string,
  ): Promise<BuildInfo | undefined> {
    const buildInfoId = await this.#hre.artifacts.getBuildInfoId(contractName);

    if (buildInfoId === undefined) {
      return undefined;
    }

    const buildInfoPath =
      await this.#hre.artifacts.getBuildInfoPath(buildInfoId);

    if (buildInfoPath === undefined) {
      return undefined;
    }

    return readJsonFile<BuildInfo>(buildInfoPath);
  }

  public loadArtifact(contractName: string): Promise<Artifact> {
    return this.#hre.artifacts.readArtifact(contractName);
  }
}
