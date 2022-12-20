import { ethers, BigNumber } from "ethers";

import { SendVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { IgnitionError } from "utils/errors";
import { isParameter } from "utils/guards";

export async function validateSendETH(
  vertex: SendVertex,
  _resultAccumulator: ResultsAccumulator
): Promise<VertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return {
      _kind: "failure",
      failure: new IgnitionError(`For send 'value' must be a BigNumber`),
    };
  }

  if (
    typeof vertex.address === "string" &&
    !ethers.utils.isAddress(vertex.address)
  ) {
    return {
      _kind: "failure",
      failure: new Error(`"${vertex.address}" is not a valid address`),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
