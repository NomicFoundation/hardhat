import {
  Artifact,
  ArtifactResolver,
  BuildInfo,
} from "@nomicfoundation/ignition-core";
import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

export class HardhatArtifactResolver implements ArtifactResolver {
  constructor(private _hre: HardhatRuntimeEnvironment) {}

  public async getBuildInfo(
    contractName: string
  ): Promise<BuildInfo | undefined> {
    const artifactPath = await this._resolvePath(contractName);

    if (artifactPath === undefined) {
      throw new Error(`Artifact path not found for ${contractName}`);
    }

    const debugPath = artifactPath.replace(".json", ".dbg.json");
    const debugJson = await fs.promises.readFile(debugPath);

    const buildInfoPath = path.join(
      path.parse(debugPath).dir,
      JSON.parse(debugJson.toString()).buildInfo
    );

    const buildInfoJson = await fs.promises.readFile(buildInfoPath);

    return JSON.parse(buildInfoJson.toString());
  }

  private async _resolvePath(
    contractName: string
  ): Promise<string | undefined> {
    const artifactPaths = await this._hre.artifacts.getArtifactPaths();

    const artifactPath = artifactPaths.find(
      (p) => path.parse(p).name === contractName
    );

    return artifactPath;
  }

  public loadArtifact(contractName: string): Promise<Artifact> {
    return this._hre.artifacts.readArtifact(contractName);
  }
}
