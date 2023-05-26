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

export function jsonStringifyWithBigint(value: unknown, prettyPrint = true) {
  return JSON.stringify(
    value,
    (_: string, v: any) =>
      typeof v === "bigint" ? { $bigint: v.toString(10) } : v,
    prettyPrint ? 2 : undefined
  );
}
