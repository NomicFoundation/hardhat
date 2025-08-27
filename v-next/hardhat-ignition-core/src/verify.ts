import type { DeploymentExecutionState } from "./internal/execution/types/execution-state.js";
import type { Artifact } from "./types/artifact.js";
import type { VerifyInfo, VerifyResult } from "./types/verify.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { FileNotFoundError } from "@nomicfoundation/hardhat-utils/fs";

import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader.js";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers.js";
import { ExecutionResultType } from "./internal/execution/types/execution-result.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "./internal/execution/types/execution-state.js";
import { assertIgnitionInvariant } from "./internal/utils/assertions.js";
import { findExecutionStatesByType } from "./internal/views/find-execution-states-by-type.js";

/**
 * Retrieve the information required to verify all contracts from a deployment on Etherscan.
 *
 * @param deploymentDir - the file directory of the deployment
 *
 * @beta
 */
export async function* getVerificationInformation(
  deploymentDir: string,
): AsyncGenerator<VerifyResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VERIFY.UNINITIALIZED_DEPLOYMENT,
      {
        deploymentDir,
      },
    );
  }

  const deploymentExStates = findExecutionStatesByType(
    ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    deploymentState,
  ).filter((exState) => exState.status === ExecutionStatus.SUCCESS);

  if (deploymentExStates.length === 0) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.VERIFY.NO_CONTRACTS_DEPLOYED,
      {
        deploymentDir,
      },
    );
  }

  for (const exState of deploymentExStates) {
    const verifyInfo = await convertExStateToVerifyInfo(
      exState,
      deploymentLoader,
    );

    yield verifyInfo;
  }
}

async function convertExStateToVerifyInfo(
  exState: DeploymentExecutionState,
  deploymentLoader: FileDeploymentLoader,
): Promise<VerifyInfo | string> {
  let artifact: Artifact;

  try {
    artifact = await deploymentLoader.loadArtifact(exState.artifactId);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof FileNotFoundError,
      `Unexpected error loading build info or artifact for deployment execution state ${
        exState.id
      }: ${e as any}`,
    );

    // if the artifact cannot be found, we cannot verify the contract
    // we return the artifact id so the recipient can know which contract could not be verified
    return exState.artifactId;
  }

  const { contractName, constructorArgs, libraries } = exState;

  assertIgnitionInvariant(
    exState.result !== undefined &&
      exState.result.type === ExecutionResultType.SUCCESS,
    `Deployment execution state ${exState.id} should have a successful result to retrieve address`,
  );

  const verifyInfo: VerifyInfo = {
    constructorArgs,
    libraries,
    address: exState.result.address,
    contract: `${artifact.sourceName}:${contractName}`,
  };

  return verifyInfo;
}
