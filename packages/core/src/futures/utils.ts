import { InternalFuture } from "./InternalFuture";
import type { FutureOutput, Unflattened } from "./types";

export function deepFlatten<T>(array: Unflattened<T>): T[] {
  let result: T[] = [];

  array.forEach((elem) => {
    if (Array.isArray(elem)) {
      result = result.concat(deepFlatten(elem));
    } else {
      result.push(elem);
    }
  });

  return result;
}

export function serializeFutureOutput(x: FutureOutput) {
  if (typeof x === "string") {
    return { _kind: "string" as const, value: x };
  } else if (typeof x === "number") {
    return { _kind: "number" as const, value: x };
  } else if ("address" in x) {
    return { _kind: "contract" as const, value: x };
  } else if ("hash" in x) {
    return { _kind: "tx" as const, value: x };
  }

  const exhaustiveCheck: never = x;
  return exhaustiveCheck;
}

export function deserializeFutureOutput(x: any) {
  if (x === null || x === undefined) {
    throw new Error("[deserializeFutureOutput] value is null or undefined");
  }

  if (!("_kind" in x)) {
    throw new Error(
      "[deserializeFutureOutput] value was not serialized by Ignition"
    );
  }

  return x.value;
}

export function mapToFutures(x: unknown): Unflattened<InternalFuture> {
  if (Array.isArray(x)) {
    return x.map(mapToFutures);
  }

  if (InternalFuture.isFuture(x)) {
    return [x];
  }

  if (typeof x === "object" && x !== null) {
    return Object.values(x).map(mapToFutures);
  }

  return [];
}

export function combineArgsAndLibrariesAsDeps(
  args: any[],
  libraries: Record<string, any>
) {
  const argFutures = deepFlatten(mapToFutures(args));
  const libraryFutures = deepFlatten(mapToFutures(Object.values(libraries)));

  const dependencies = argFutures.concat(libraryFutures);

  return dependencies;
}
