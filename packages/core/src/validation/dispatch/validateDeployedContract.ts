import { isAddress } from "@ethersproject/address";

import { Services } from "services/types";
import { DeployedContractDeploymentVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError } from "utils/errors";

export async function validateDeployedContract(
  vertex: DeployedContractDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  _context: { services: Services }
): Promise<ValidationVertexVisitResult> {
  if (typeof vertex.address === "string" && !isAddress(vertex.address)) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `The existing contract ${vertex.label} has an invalid address ${vertex.address}`
      ),
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
