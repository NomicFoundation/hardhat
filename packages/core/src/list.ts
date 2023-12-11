import { readdir } from "fs-extra";
import { join } from "path";

import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { assertIgnitionInvariant } from "./internal/utils/assertions";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { ArtifactResolver } from "./types/artifact";
import { GenericContractInfo, ListResult } from "./types/list";

/**
 * Return a list of all deployments in the deployment directory.
 *
 * @param deploymentDir - the directory of the deployments
 *
 * @beta
 */
export async function list(
  deploymentDir: string,
  artifactResolver: ArtifactResolver
): Promise<ListResult> {
  const deploymentIds = await readdir(deploymentDir);

  const listResult: ListResult = {};

  for (const deploymentId of deploymentIds) {
    const deploymentLoader = new FileDeploymentLoader(
      join(deploymentDir, deploymentId)
    );
    const deploymentState = await loadDeploymentState(deploymentLoader);

    assertIgnitionInvariant(
      deploymentState !== undefined,
      `Uninitialized deployment "${deploymentId}" found in deployment directory`
    );

    const deployedContracts = findDeployedContracts(deploymentState);

    const futures: Array<[string, GenericContractInfo[string]]> = [];

    for (const [futureId, deployedContract] of Object.entries(
      deployedContracts
    )) {
      const artifact = await artifactResolver.loadArtifact(
        deployedContract.contractName
      );

      futures.push([
        futureId,
        {
          contractName: deployedContract.contractName,
          sourceName: artifact.sourceName,
          address: deployedContract.address,
          abi: artifact.abi,
        },
      ]);
    }

    listResult[deploymentId] = Object.fromEntries([
      ...futures,
      ["chainId", deploymentState.chainId],
    ]);
  }

  return listResult;
}
