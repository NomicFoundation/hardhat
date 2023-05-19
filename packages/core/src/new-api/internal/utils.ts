import { ethers } from "ethers";

import { isFuture } from "../type-guards";
import { ArgumentType, Future } from "../types/module";

export function getFutures(args: ArgumentType[]): Future[] {
  return args.flatMap(_getFutures);
}

function _getFutures(argument: ArgumentType): Future[] {
  if (isFuture(argument)) {
    return [argument];
  }

  if (Array.isArray(argument)) {
    return getFutures(argument);
  }

  if (typeof argument === "object" && argument !== null) {
    return getFutures(Object.values(argument));
  }

  return [];
}

export function isAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}
