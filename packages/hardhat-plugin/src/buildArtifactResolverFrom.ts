import {
  Artifact,
  ArtifactResolver,
  IgnitionError,
} from "@ignored/ignition-core";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

export function buildArtifactResolverFrom(
  hre: HardhatRuntimeEnvironment
): ArtifactResolver {
  return {
    load: async (contractName: string): Promise<Artifact> =>
      hre.artifacts.readArtifact(contractName),
    resolvePath: async (contractName: string): Promise<string> => {
      const artifactPaths = await hre.artifacts.getArtifactPaths();

      const artifactPath = artifactPaths.find(
        (p) => path.parse(p).name === contractName
      );

      if (artifactPath === undefined) {
        throw new IgnitionError(`Artifact path not found for ${contractName}`);
      }

      return artifactPath;
    },
  };
}
