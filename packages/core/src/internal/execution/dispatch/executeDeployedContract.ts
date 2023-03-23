import type {
  DeployedContractExecutionVertex,
  ExecutionResultsAccumulator,
  ExecutionVertexVisitResult,
} from "../../types/executionGraph";
import type { Services } from "../../types/services";

import { VertexResultEnum } from "../../types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeDeployedContract(
  { label, address, abi }: DeployedContractExecutionVertex,
  _resultAccumulator: ExecutionResultsAccumulator,
  _: { services: Services }
): Promise<ExecutionVertexVisitResult> {
  const resolve = resolveFrom(_resultAccumulator);

  const resolvedAddress = toAddress(resolve(address));

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      name: label,
      abi,
      address: resolvedAddress,
    },
  };
}
