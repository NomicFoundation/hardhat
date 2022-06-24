import type { BindingOutput, Unflattened } from "./types";

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

export function serializeBindingOutput(x: BindingOutput) {
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

export function deserializeBindingOutput(x: any) {
  if (x === null || x === undefined) {
    throw new Error("[deserializeBindingOutput] value is null or undefined");
  }

  if (!("_kind" in x)) {
    throw new Error(
      "[deserializeBindingOutput] value was not serialized by Ignition"
    );
  }

  return x.value;
}
