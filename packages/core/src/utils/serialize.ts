import { FutureOutput, SerializedFutureResult } from "types/serialization";

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
  throw new Error(`Unexpected serialization type ${exhaustiveCheck}`);
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
