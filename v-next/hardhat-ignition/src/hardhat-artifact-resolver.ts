/* eslint-disable no-restricted-syntax */
import type {
  Artifact,
  ArtifactResolver,
  BuildInfo,
} from "@ignored/hardhat-vnext-ignition-core";

import fs from "node:fs";
import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export class HardhatArtifactResolver implements ArtifactResolver {
  // TODO: HH3 update to the correct type as part of the Artifact resolver step
  constructor(private readonly _hre: any) {}

  public async getBuildInfo(
    contractName: string,
  ): Promise<BuildInfo | undefined> {
    // If a fully qualified name is used, we can can
    // leverage the artifact manager directly to load the build
    // info.
    if (this._isFullyQualifiedName(contractName)) {
      return this._hre.artifacts.getBuildInfo(contractName);
    }

    // Otherwise we have only the contract name, and need to
    // resolve the artifact for the contract ourselves.
    // We can build on the assumption that the contract name
    // is unique based on Module validation.
    const artifactPath = await this._resolvePath(contractName);

    if (artifactPath === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.ARTIFACT_PATH_NOT_FOUND,
        {
          contractName,
        },
      );
    }

    const debugPath = artifactPath.replace(".json", ".dbg.json");
    const debugJson = await fs.promises.readFile(debugPath);

    const buildInfoPath = path.join(
      path.parse(debugPath).dir,
      JSON.parse(debugJson.toString()).buildInfo,
    );

    const buildInfoJson = await fs.promises.readFile(buildInfoPath);

    return JSON.parse(buildInfoJson.toString());
  }

  private async _resolvePath(
    contractName: string,
  ): Promise<string | undefined> {
    const artifactPaths = await this._hre.artifacts.getArtifactPaths();

    const artifactPath = artifactPaths.find(
      (p: string) => path.parse(p).name === contractName,
    );

    return artifactPath;
  }

  public loadArtifact(contractName: string): Promise<Artifact> {
    return this._hre.artifacts.readArtifact(contractName);
  }

  /**
   * Returns true if a name is fully qualified, and not just a bare contract name.
   *
   * This is based on Hardhat's own test for fully qualified names, taken
   * from `contract-names.ts` in `hardhat-core` utils.
   */
  private _isFullyQualifiedName(contractName: string): boolean {
    return contractName.includes(":");
  }
}
