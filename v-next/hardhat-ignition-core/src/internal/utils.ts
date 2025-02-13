import type { ArgumentType, Future } from "../types/module.js";

import { isFuture } from "../type-guards.js";

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
