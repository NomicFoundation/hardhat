import { BigNumber } from "ethers";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class InvalidArtifactError extends NomicLabsHardhatPluginError {
  constructor(name: string) {
    super("ignition", `Artifact with name '${name}' doesn't exist`);
  }
}

export class IgnitionError extends NomicLabsHardhatPluginError {
  constructor(message: string) {
    super("ignition", message);
  }
}

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
