import { deserializeError } from "serialize-error";

/**
 * When JSON.parsing journal messages deserialize, this defines the replacer.
 */
export function deserializeReplacer(_key: string, value: unknown) {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }

  if (_isSerializedBigInt(value)) {
    return BigInt(value.substring(0, value.length - 1));
  }

  if (typeof value === "object" && value !== null && "message" in value) {
    return deserializeError(value);
  }

  return value;
}

function _isSerializedBigInt(value: unknown): value is string {
  return typeof value === "string" && /d+n/.test(value);
}
