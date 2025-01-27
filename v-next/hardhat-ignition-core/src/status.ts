import type { ArtifactResolver } from "./types/artifact";
import type { StatusResult } from "./types/status";

import { IgnitionError } from "./errors";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ERRORS } from "./internal/errors-list";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { findStatus } from "./internal/views/find-status";

/**
 * Show the status of a deployment.
 *
 * @param deploymentDir - the directory of the deployment to get the status of
 * @param _artifactResolver - DEPRECATED: this parameter is not used and will be removed in the future
 *
 * @beta
 */
export async function status(
  deploymentDir: string,
  _artifactResolver?: Omit<ArtifactResolver, "getBuildInfo">,
): Promise<StatusResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.STATUS.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const futureStatuses = findStatus(deploymentState);
  const deployedContracts = findDeployedContracts(deploymentState);

  const contracts: StatusResult["contracts"] = {};

  for (const [futureId, deployedContract] of Object.entries(
    deployedContracts,
  )) {
    const artifact = await deploymentLoader.loadArtifact(deployedContract.id);

    contracts[futureId] = {
      ...deployedContract,
      contractName: artifact.contractName,
      sourceName: artifact.sourceName,
      abi: artifact.abi,
    };
  }

  const statusResult: StatusResult = {
    ...futureStatuses,
    chainId: deploymentState.chainId,
    contracts,
  };

  return statusResult;
}
