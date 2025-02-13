/**
 * When JSON.parsing journal messages deserialize, this defines the replacer.
 */
export function deserializeReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }

  if (_isSerializedBigInt(value)) {
    return BigInt(value.value);
  }

  return value;
}

function _isSerializedBigInt(
  arg: unknown,
): arg is { _kind: "bigint"; value: string } {
  return (
    arg !== null &&
    typeof arg === "object" &&
    "_kind" in arg &&
    arg._kind === "bigint"
  );
}
