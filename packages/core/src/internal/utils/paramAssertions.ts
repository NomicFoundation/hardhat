import { BigNumber } from "ethers";

import { IgnitionError } from "../../errors";

export function assertStringParam(param: any, paramName: string) {
  if (typeof param !== "string") {
    throw new IgnitionError(`\`${paramName}\` must be a string`);
  }
}

export function assertFunctionParam(param: any, paramName: string) {
  if (typeof param !== "function") {
    throw new IgnitionError(`\`${paramName}\` must be a function`);
  }
}

export function assertBigNumberParam(param: any, paramName: string) {
  if (param !== undefined) {
    if (!BigNumber.isBigNumber(param)) {
      throw new IgnitionError(`\`${paramName}\` must be a BigNumber`);
    }
  }
}
