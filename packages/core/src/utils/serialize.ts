import { serializeError } from "serialize-error";

import { FutureOutput, SerializedFutureResult } from "types/serialization";

import { IgnitionError } from "./errors";

export function serializeFutureOutput(x: FutureOutput): SerializedFutureResult {
  if (typeof x === "string") {
    return { _kind: "string" as const, value: x };
  } else if (typeof x === "number") {
    return { _kind: "number" as const, value: x };
  } else if ("address" in x) {
    return { _kind: "contract" as const, value: x };
  } else if ("hash" in x) {
    return { _kind: "tx" as const, value: x };
  } else if ("topics" in x) {
    return { _kind: "event" as const, value: x };
  }

  const exhaustiveCheck: never = x;
  throw new IgnitionError(`Unexpected serialization type ${exhaustiveCheck}`);
}

export function deserializeFutureOutput(x: any) {
  if (x === null || x === undefined) {
    throw new IgnitionError(
      "[deserializeFutureOutput] value is null or undefined"
    );
  }

  if (!("_kind" in x)) {
    throw new IgnitionError(
      "[deserializeFutureOutput] value was not serialized by Ignition"
    );
  }

  return x.value;
}

/**
 * When stringifying core state, use this as the replacer.
 */
export function serializeReplacer(_key: string, value: unknown) {
  if (value instanceof Set) {
    return Array.from(value).sort();
  }

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  if (typeof value === "bigint") {
    return `${value.toString(10)}n`;
  }

  if (value instanceof Error) {
    return serializeError(new Error(value.message));
  }

  if (value instanceof Object && !(value instanceof Array)) {
    const obj: any = value;
    return Object.keys(obj)
      .sort()
      .reduce((sorted: any, key) => {
        sorted[key] = obj[key];
        return sorted;
      }, {});
  }

  return value;
}
