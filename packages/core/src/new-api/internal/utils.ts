import { ethers } from "ethers";

import { isFuture } from "../type-guards";
import { ArgumentType, Future } from "../types/module";

export function resolveArgsToFutures(args: ArgumentType[]): Future[] {
  return args.flatMap(_resolveArgToFutures);
}

function _resolveArgToFutures(argument: ArgumentType): Future[] {
  if (isFuture(argument)) {
    return [argument];
  }

  if (Array.isArray(argument)) {
    return resolveArgsToFutures(argument);
  }

  if (typeof argument === "object" && argument !== null) {
    return resolveArgsToFutures(Object.values(argument));
  }

  return [];
}

export function isAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}
