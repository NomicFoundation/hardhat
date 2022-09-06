import { Services } from "../../services/types";
import { DeployedContract } from "../../types/executionGraph";
import { VertexVisitResult } from "../../types/graph";

export async function executeDeployedContract(
  { label, address, abi }: DeployedContract,
  _resultAccumulator: Map<number, any>,
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
