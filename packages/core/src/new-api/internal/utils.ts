import { ArgumentType, Future, FutureType } from "../types/module";

export function isFuture(potential: unknown): potential is Future {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "number" &&
    FutureType[potential.type] !== undefined
  );
}

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
