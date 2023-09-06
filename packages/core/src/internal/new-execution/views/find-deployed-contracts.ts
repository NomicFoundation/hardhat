import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import { ExecutionResultType } from "../types/execution-result";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";

interface DeployedContract {
  futureId: string;
  contractName: string;
  contractAddress: string;
}

export function findDeployedContracts(
  deploymentState: DeploymentState
): DeployedContract[] {
  return Object.values(deploymentState.executionStates)
    .filter(
      (
        exState
      ): exState is DeploymentExecutionState | ContractAtExecutionState =>
        exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
        exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
    )
    .filter((des) => des.status === ExecutionStatus.SUCCESS)
    .map(_toDeployedContract);
}

function _toDeployedContract(
  des: DeploymentExecutionState | ContractAtExecutionState
): DeployedContract {
  switch (des.type) {
    case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE: {
      assertIgnitionInvariant(
        des.result !== undefined &&
          des.result.type === ExecutionResultType.SUCCESS,
        `Deployment execution state ${des.id} should have a successful result to retrieve address`
      );

      return {
        futureId: des.id,
        contractName: des.contractName,
        contractAddress: des.result.address,
      };
    }
    case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE: {
      return {
        futureId: des.id,
        contractName: des.contractName,
        contractAddress: des.contractAddress,
      };
    }
  }
}
