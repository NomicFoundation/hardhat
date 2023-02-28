import { ethers, BigNumber } from "ethers";

import { SendVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError } from "utils/errors";
import { isParameter } from "utils/guards";

export async function validateSendETH(
  vertex: SendVertex,
  _resultAccumulator: ValidationResultsAccumulator
): Promise<ValidationVertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(`For send 'value' must be a BigNumber`),
    };
  }

  if (
    typeof vertex.address === "string" &&
    !ethers.utils.isAddress(vertex.address)
  ) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(`"${vertex.address}" is not a valid address`),
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
