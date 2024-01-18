import { IgnitionError } from "./errors";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ERRORS } from "./internal/errors-list";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { findStatus } from "./internal/views/find-status";
import { StatusResult } from "./types/status";

/**
 * Show the status of a deployment.
 *
 * @param deploymentDir - the directory of the deployment to get the status of
 *
 * @beta
 */
export async function status(deploymentDir: string): Promise<StatusResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.STATUS.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const futureStatuses = findStatus(deploymentState);
  const contracts = findDeployedContracts(deploymentState);

  const statusResult: StatusResult = {
    ...futureStatuses,
    contracts,
  };

  return statusResult;
}
