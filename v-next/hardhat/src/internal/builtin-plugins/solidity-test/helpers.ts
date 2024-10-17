import type { ArtifactsManager } from "../../../types/artifacts.js";
import type { ArtifactId, Artifact } from "@ignored/edr";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export async function buildSolidityTestsInput(
  hardhatArtifacts: ArtifactsManager,
  isTestArtifact: (artifact: Artifact) => boolean = () => true,
): Promise<{ artifacts: Artifact[]; testSuiteIds: ArtifactId[] }> {
  const fqns = await hardhatArtifacts.getAllFullyQualifiedNames();
  const artifacts: Artifact[] = [];
  const testSuiteIds: ArtifactId[] = [];

  for (const fqn of fqns) {
    const hardhatArtifact = await hardhatArtifacts.readArtifact(fqn);
    const buildInfo = await hardhatArtifacts.getBuildInfo(fqn);

    if (buildInfo === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY_TESTS.BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn,
        },
      );
    }

    const id = {
      name: hardhatArtifact.contractName,
      solcVersion: buildInfo.solcVersion,
      source: hardhatArtifact.sourceName,
    };

    const contract = {
      abi: JSON.stringify(hardhatArtifact.abi),
      bytecode: hardhatArtifact.bytecode,
      deployedBytecode: hardhatArtifact.deployedBytecode,
    };

    const artifact = { id, contract };
    artifacts.push(artifact);
    if (isTestArtifact(artifact)) {
      testSuiteIds.push(artifact.id);
    }
  }

  return { artifacts, testSuiteIds };
}
