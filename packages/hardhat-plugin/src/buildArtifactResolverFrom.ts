import {
  Artifact,
  ArtifactResolver,
  BuildInfo,
  IgnitionError,
} from "@ignored/ignition-core";
import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

export function buildArtifactResolverFrom(
  hre: HardhatRuntimeEnvironment
): ArtifactResolver {
  return {
    loadArtifact: async (contractName: string): Promise<Artifact> =>
      hre.artifacts.readArtifact(contractName),
    getBuildInfo: async (
      contractName: string
    ): Promise<BuildInfo | undefined> => {
      const artifactPath = await _resolvePath(hre, contractName);

      const debugPath = artifactPath.replace(".json", ".dbg.json");
      const debugJson = await fs.promises.readFile(debugPath);

      return JSON.parse(debugJson.toString());
    },
  };
}

async function _resolvePath(
  hre: HardhatRuntimeEnvironment,
  contractName: string
): Promise<string> {
  const artifactPaths = await hre.artifacts.getArtifactPaths();

  const artifactPath = artifactPaths.find(
    (p) => path.parse(p).name === contractName
  );

  if (artifactPath === undefined) {
    throw new IgnitionError(`Artifact path not found for ${contractName}`);
  }

  return artifactPath;
}
