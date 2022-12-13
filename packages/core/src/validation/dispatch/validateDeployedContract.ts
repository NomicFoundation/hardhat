import { isAddress } from "@ethersproject/address";

import { Services } from "services/types";
import { DeployedContractDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

export async function validateDeployedContract(
  vertex: DeployedContractDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  if (typeof vertex.address === "string" && !isAddress(vertex.address)) {
    return {
      _kind: "failure",
      failure: new Error(
        `The existing contract ${vertex.label} has an invalid address ${vertex.address}`
      ),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
