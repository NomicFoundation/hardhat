import type { PrefixedHexString } from "./hex.js";
import type { deployContract as DeployContractT } from "micro-eth-signer/advanced/abi.js";

import { ensureError } from "./error.js";
import {
  AbiEncodingFailedError,
  AbiParametersLengthMismatchError,
} from "./errors/abi.js";
import { getPrefixedHexString } from "./hex.js";
import { normalizeAbiValue, toUnnamedAbiParameters } from "./internal/abi.js";

// We don't load micro-eth-signer on startup because it's slow to initialize,
// and most callers of this module never encode anything.
let deployContractImpl: typeof DeployContractT | undefined;

/**
 * A parameter of an ABI fragment.
 */
export interface AbiParameter {
  readonly name?: string;
  readonly type: string;
  readonly components?: readonly AbiParameter[];
}

/**
 * An entry of a contract's ABI. Only the fields needed to encode values are
 * modeled.
 */
export interface AbiFragment {
  readonly type?: string;
  readonly name?: string;
  readonly inputs?: readonly AbiParameter[];
}

/**
 * The signedness and size of a Solidity integer type.
 */
export interface IntType {
  readonly signed: boolean;
  readonly bits: number;
}

/**
 * The inclusive range of values that a Solidity integer type can hold.
 */
export interface IntTypeRange {
  readonly min: bigint;
  readonly max: bigint;
}

const INT_TYPE_PATTERN = /^(u?)int([1-9]\d*)?$/;

/**
 * Parses a Solidity integer type name, like `uint256` or `int128`, into its
 * signedness and size in bits. As in Solidity, `uint` and `int` are accepted as
 * aliases of the 256-bit types.
 *
 * @param type The type name to parse.
 * @returns The parsed type, or `undefined` if it isn't a Solidity integer type.
 */
export function parseIntType(type: string): IntType | undefined {
  const match = INT_TYPE_PATTERN.exec(type);

  if (match === null) {
    return undefined;
  }

  const bits = match[2] === undefined ? 256 : Number(match[2]);

  if (bits > 256 || bits % 8 !== 0) {
    return undefined;
  }

  return { signed: match[1] === "", bits };
}

/**
 * Returns the inclusive range of values that a Solidity integer type can hold.
 *
 * @param intType The integer type, as returned by {@link parseIntType}.
 * @returns The minimum and maximum values of the type.
 */
export function getIntTypeRange({ signed, bits }: IntType): IntTypeRange {
  if (signed) {
    const bound = 2n ** BigInt(bits - 1);
    return { min: -bound, max: bound - 1n };
  }

  return { min: 0n, max: 2n ** BigInt(bits) - 1n };
}

/**
 * Returns the parameters of the constructor declared in an ABI.
 *
 * An ABI that declares no constructor yields an empty array, matching the
 * Solidity semantics of an implicit parameterless constructor.
 *
 * @param abi The ABI to read the constructor from.
 * @returns The constructor's parameters.
 */
export function getAbiConstructorParameters(
  abi: readonly AbiFragment[],
): readonly AbiParameter[] {
  return abi.find(({ type }) => type === "constructor")?.inputs ?? [];
}

/**
 * ABI-encodes a list of values, as Solidity encodes a constructor's arguments
 * (i.e. without a function selector).
 *
 * Values are accepted in the same shapes that most Ethereum libraries accept:
 * integers as bigints, safe numbers, or decimal or hex strings; `bytes` as hex
 * strings or `Uint8Array`s; tuples as arrays or as objects keyed by component
 * name; and addresses with or without the "0x" prefix.
 *
 * @param parameters The ABI parameters to encode the values as.
 * @param values The values to encode, in the order of the parameters.
 * @returns The encoded values as a prefixed hex string, or "0x" if there are none.
 * @throws AbiParametersLengthMismatchError If the counts don't match.
 * @throws InvalidAbiValueError If a value can't be encoded as its type.
 * @throws AbiValueOutOfBoundsError If a numeric value is out of its type's range.
 * @throws UnsupportedAbiTypeError If a parameter's type can't be encoded.
 * @throws AbiEncodingFailedError If the encoder fails for any other reason.
 */
export async function encodeAbiParameters(
  parameters: readonly AbiParameter[],
  values: readonly unknown[],
): Promise<PrefixedHexString> {
  if (parameters.length !== values.length) {
    throw new AbiParametersLengthMismatchError(
      parameters.length,
      values.length,
    );
  }

  // There's nothing to encode, so we avoid loading micro-eth-signer at all.
  if (parameters.length === 0) {
    return "0x";
  }

  const normalizedValues = parameters.map((parameter, i) =>
    normalizeAbiValue(parameter, values[i], parameter.name ?? `[${i}]`),
  );

  if (deployContractImpl === undefined) {
    ({ deployContract: deployContractImpl } =
      await import("micro-eth-signer/advanced/abi.js"));
  }

  // The encoder takes the bare value when there's a single parameter, and a
  // positional array otherwise. The array is positional at every level because
  // toUnnamedAbiParameters drops the names.
  const value =
    parameters.length === 1 ? normalizedValues[0] : normalizedValues;

  // NOTE: this must not be annotated nor frozen with `as const`. With `type`
  // widened to `string`, micro-eth-signer's generic overload resolves to its
  // untyped form, which is what we want for a dynamically built ABI.
  const abi = [
    { type: "constructor", inputs: toUnnamedAbiParameters(parameters) },
  ];

  let encoded: string;
  try {
    // deployContract returns `<bytecode><encoded args>`, so we pass no bytecode.
    encoded = deployContractImpl(abi, "0x", value);
  } catch (error) {
    // Unreachable unless normalizeAbiValue let an invalid value through.
    ensureError(error);
    throw new AbiEncodingFailedError(error);
  }

  return getPrefixedHexString(encoded);
}

export {
  AbiEncodingError,
  AbiEncodingFailedError,
  AbiParametersLengthMismatchError,
  AbiValueOutOfBoundsError,
  InvalidAbiValueError,
  UnsupportedAbiTypeError,
  isAbiEncodingError,
  type AbiEncodingErrorKind,
  type AnyAbiEncodingError,
} from "./errors/abi.js";
