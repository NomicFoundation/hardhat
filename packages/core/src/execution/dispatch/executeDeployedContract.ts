import { Services } from "services/types";
import { DeployedContract } from "types/executionGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

export async function executeDeployedContract(
  { label, address, abi }: DeployedContract,
  _resultAccumulator: ResultsAccumulator,
  _: { services: Services }
): Promise<VertexVisitResult> {
  return {
    _kind: "success",
    result: {
      name: label,
      abi,
      address,
    },
  };
}
