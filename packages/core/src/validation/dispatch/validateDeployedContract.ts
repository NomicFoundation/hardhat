import { isAddress } from "@ethersproject/address";

import { Services } from "services/types";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { DeployedContractRecipeVertex } from "types/recipeGraph";

export async function validateDeployedContract(
  vertex: DeployedContractRecipeVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  if (!isAddress(vertex.address)) {
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
