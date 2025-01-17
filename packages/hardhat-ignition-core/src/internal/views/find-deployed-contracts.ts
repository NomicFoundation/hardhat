import { DeployedContract } from "../../types/deploy";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionResultType } from "../execution/types/execution-result";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../execution/types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

export function findDeployedContracts(deploymentState: DeploymentState): {
  [futureId: string]: DeployedContract;
} {
  return Object.values(deploymentState.executionStates)
    .filter(
      (
        exState
      ): exState is DeploymentExecutionState | ContractAtExecutionState =>
        exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
        exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
    )
    .filter((des) => des.status === ExecutionStatus.SUCCESS)
    .map(_toDeployedContract)
    .reduce<{ [futureId: string]: DeployedContract }>((acc, contract) => {
      acc[contract.id] = contract;
      return acc;
    }, {});
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
        id: des.id,
        contractName: des.contractName,
        address: des.result.address,
      };
    }
    case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE: {
      return {
        id: des.id,
        contractName: des.contractName,
        address: des.contractAddress,
      };
    }
  }
}
