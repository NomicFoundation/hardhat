import type { AbiParameter } from "../abi.js";

import { getIntTypeRange, parseIntType } from "../abi.js";
import {
  AbiValueOutOfBoundsError,
  InvalidAbiValueError,
  UnsupportedAbiTypeError,
} from "../errors/abi.js";
import { isAddress } from "../eth.js";
import {
  getPrefixedHexString,
  getUnprefixedHexString,
  hexStringToBytes,
  isHexString,
} from "../hex.js";
import { isObject } from "../lang.js";

/**
 * A value in the shape that the encoder expects. Aggregates are always
 * positional, because we strip the parameter names before encoding.
 */
export type NormalizedAbiValue =
  bigint | boolean | string | Uint8Array | NormalizedAbiValue[];

/**
 * An ABI parameter with every name removed, recursively.
 */
export interface UnnamedAbiParameter {
  readonly type: string;
  readonly components?: readonly UnnamedAbiParameter[];
}

// In Solidity the rightmost suffix is the outermost array, so `uint256[2][]` is
// a dynamic array of `uint256[2]`. The greedy `.+` matches that last suffix.
const ARRAY_REGEX = /^(.+)(\[(\d+)?\])$/;
const BYTES_N_REGEX = /^bytes([0-9]{1,2})$/;
const DECIMAL_REGEX = /^\d+$/;
const HEX_REGEX = /^0x[0-9a-f]+$/i;

/**
 * Removes the names of a list of ABI parameters, recursively.
 *
 * The encoder derives the shape of the value it expects from whether the
 * parameters are named: named ones take an object keyed by name, unnamed ones
 * take a positional array. Dropping the names makes every aggregate positional,
 * at every nesting level.
 *
 * @param parameters The parameters to strip.
 * @returns The same parameters, without their names.
 */
export function toUnnamedAbiParameters(
  parameters: readonly AbiParameter[],
): UnnamedAbiParameter[] {
  return parameters.map(({ type, components }) =>
    components === undefined
      ? { type }
      : { type, components: toUnnamedAbiParameters(components) },
  );
}

/**
 * Converts a value into the shape that the encoder expects for a parameter,
 * validating it against the parameter's Solidity type.
 *
 * @param parameter The ABI parameter to normalize the value for.
 * @param value The value to normalize.
 * @param path The path of the parameter, used to report errors.
 * @returns The normalized value.
 * @throws InvalidAbiValueError If the value can't be encoded as the type.
 * @throws AbiValueOutOfBoundsError If a numeric value is out of the type's range.
 * @throws UnsupportedAbiTypeError If the type itself can't be encoded.
 */
export function normalizeAbiValue(
  parameter: AbiParameter,
  value: unknown,
  path: string,
): NormalizedAbiValue {
  const { type } = parameter;

  // Arrays must be checked first, as the check is recursive.
  const arrayMatch = ARRAY_REGEX.exec(type);
  if (arrayMatch !== null) {
    return normalizeArray(parameter, value, path, arrayMatch);
  }

  if (type === "tuple") {
    return normalizeTuple(parameter, value, path);
  }

  if (type === "address") {
    return normalizeAddress(value, path);
  }

  if (type === "bool") {
    if (typeof value !== "boolean") {
      throw new InvalidAbiValueError(
        path,
        type,
        value,
        "invalid boolean value",
      );
    }
    return value;
  }

  if (type === "string") {
    if (typeof value !== "string") {
      throw new InvalidAbiValueError(path, type, value, "invalid string value");
    }
    return value;
  }

  if (type === "bytes") {
    return normalizeBytes(value, path, type, undefined);
  }

  const bytesNMatch = BYTES_N_REGEX.exec(type);
  if (bytesNMatch !== null) {
    const length = Number(bytesNMatch[1]);
    if (length < 1 || length > 32) {
      throw new UnsupportedAbiTypeError(path, type);
    }
    return normalizeBytes(value, path, type, length);
  }

  const intType = parseIntType(type);
  if (intType !== undefined) {
    return normalizeInt(value, path, type, intType);
  }

  throw new UnsupportedAbiTypeError(path, type);
}

function normalizeArray(
  parameter: AbiParameter,
  value: unknown,
  path: string,
  arrayMatch: RegExpExecArray,
): NormalizedAbiValue[] {
  const { type } = parameter;
  const elementType = arrayMatch[1];
  const fixedLength = arrayMatch[3];

  if (!Array.isArray(value)) {
    throw new InvalidAbiValueError(
      path,
      type,
      value,
      "invalid array value, expected a JS array",
    );
  }

  if (fixedLength !== undefined && value.length !== Number(fixedLength)) {
    throw new InvalidAbiValueError(
      path,
      type,
      value,
      `invalid array length, expected ${fixedLength} elements but got ${value.length}`,
    );
  }

  const elementParameter = { ...parameter, type: elementType };
  return value.map((element, i) =>
    normalizeAbiValue(elementParameter, element, `${path}[${i}]`),
  );
}

function normalizeTuple(
  parameter: AbiParameter,
  value: unknown,
  path: string,
): NormalizedAbiValue[] {
  const { type, components } = parameter;

  // The encoder rejects zero-sized tuples, as arrays of them can be used to
  // DoS the decoder.
  if (components === undefined || components.length === 0) {
    throw new UnsupportedAbiTypeError(path, type);
  }

  if (Array.isArray(value)) {
    if (value.length !== components.length) {
      throw new InvalidAbiValueError(
        path,
        type,
        value,
        `invalid tuple length, expected ${components.length} components but got ${value.length}`,
      );
    }

    return components.map((component, i) =>
      normalizeAbiValue(
        component,
        value[i],
        component.name === undefined
          ? `${path}[${i}]`
          : `${path}.${component.name}`,
      ),
    );
  }

  if (isObject(value)) {
    return components.map((component) => {
      const { name } = component;

      if (name === undefined || name === "") {
        throw new InvalidAbiValueError(
          path,
          type,
          value,
          "invalid tuple value, it has unnamed components so it must be provided as an array",
        );
      }

      const componentPath = `${path}.${name}`;
      if (!(name in value)) {
        throw new InvalidAbiValueError(
          componentPath,
          component.type,
          undefined,
          `missing value for the tuple component "${name}"`,
        );
      }

      return normalizeAbiValue(component, value[name], componentPath);
    });
  }

  throw new InvalidAbiValueError(
    path,
    type,
    value,
    "invalid tuple value, expected an array or an object",
  );
}

function normalizeAddress(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new InvalidAbiValueError(
      path,
      "address",
      value,
      "invalid address value, expected a string",
    );
  }

  const address = getPrefixedHexString(value);
  if (!isAddress(address)) {
    throw new InvalidAbiValueError(
      path,
      "address",
      value,
      "invalid address value",
    );
  }

  return address.toLowerCase();
}

function normalizeBytes(
  value: unknown,
  path: string,
  type: string,
  length: number | undefined,
): Uint8Array {
  let bytes: Uint8Array;

  if (value instanceof Uint8Array) {
    bytes = value;
  } else if (typeof value === "string" && isHexString(value)) {
    const unprefixed = getUnprefixedHexString(value);
    if (unprefixed.length % 2 !== 0) {
      throw new InvalidAbiValueError(
        path,
        type,
        value,
        "invalid bytes value, the hex string has an odd length",
      );
    }
    bytes =
      unprefixed.length === 0 ? new Uint8Array() : hexStringToBytes(unprefixed);
  } else {
    throw new InvalidAbiValueError(
      path,
      type,
      value,
      "invalid bytes value, expected a hex string or a Uint8Array",
    );
  }

  if (length !== undefined && bytes.length !== length) {
    throw new InvalidAbiValueError(
      path,
      type,
      value,
      `invalid bytes length, expected ${length} bytes but got ${bytes.length}`,
    );
  }

  return bytes;
}

function normalizeInt(
  value: unknown,
  path: string,
  type: string,
  intType: { signed: boolean; bits: number },
): bigint {
  let normalized: bigint;

  if (typeof value === "bigint") {
    normalized = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new InvalidAbiValueError(
        path,
        type,
        value,
        "invalid numeric value, it is not a safe integer; use a bigint or a string instead",
      );
    }
    normalized = BigInt(value);
  } else if (typeof value === "string") {
    normalized = parseIntValue(value, path, type);
  } else {
    throw new InvalidAbiValueError(path, type, value, "invalid numeric value");
  }

  const { min, max } = getIntTypeRange(intType);
  if (normalized < min || normalized > max) {
    throw new AbiValueOutOfBoundsError(path, type, value, min, max);
  }

  return normalized;
}

function parseIntValue(value: string, path: string, type: string): bigint {
  // BigInt() throws on a signed hex string, so the sign is handled here.
  const negative = value.startsWith("-");
  const magnitude = negative ? value.slice(1) : value;

  if (!DECIMAL_REGEX.test(magnitude) && !HEX_REGEX.test(magnitude)) {
    throw new InvalidAbiValueError(path, type, value, "invalid numeric value");
  }

  const parsed = BigInt(magnitude);
  return negative ? -parsed : parsed;
}
