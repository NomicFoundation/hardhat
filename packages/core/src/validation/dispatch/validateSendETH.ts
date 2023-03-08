import { ethers, BigNumber } from "ethers";

import { SendVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { isParameter } from "utils/guards";

import { buildValidationError } from "./helpers";

export async function validateSendETH(
  vertex: SendVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return buildValidationError(
      vertex,
      `For send 'value' must be a BigNumber`,
      callPoints
    );
  }

  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For send 'from' must be a valid address string`,
      callPoints
    );
  }

  if (
    typeof vertex.address === "string" &&
    !ethers.utils.isAddress(vertex.address)
  ) {
    return buildValidationError(
      vertex,
      `"${vertex.address}" is not a valid address`,
      callPoints
    );
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
