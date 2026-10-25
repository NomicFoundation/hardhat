import type { PrefixedHexString } from "./hex.js";
import type { deployContract as DeployContractT } from "micro-eth-signer/advanced/abi.js";

import { ensureError } from "./error.js";
import {
  AbiEncodingFailedError,
  AbiParametersLengthMismatchError,
  InvalidAbiSignatureError,
} from "./errors/abi.js";
import { bytesToHexString, getPrefixedHexString } from "./hex.js";
import {
  AbiSignatureParser,
  hashCanonicalAbiSignature,
} from "./internal/abi-signature.js";
import {
  assertNoDuplicateAbiParameterNames,
  normalizeAbiValue,
  toUnnamedAbiParameters,
} from "./internal/abi.js";

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
  readonly indexed?: boolean;
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
 * A parsed human-readable signature of a function, event or error.
 */
export interface AbiSignature {
  /** The keyword the signature starts with, if any. */
  readonly kind?: "function" | "event" | "error" | "constructor";
  /**
   * The name, or "" for a constructor or a bare parameter list, like
   * `(uint256,bool)`.
   */
  readonly name: string;
  readonly inputs: readonly AbiParameter[];
  /**
   * The return types, written as `f(uint256)(bool)` or
   * `f(uint256) returns (bool)`. They can hold custom types, like `IPool`, kept
   * as written, which aren't ABI types and must be resolved before decoding.
   */
  readonly outputs: readonly AbiParameter[];
  /** Set to true if the signature has the `anonymous` modifier of events. */
  readonly anonymous?: boolean;
}

/**
 * A parsed human-readable signature of a function or error.
 */
export interface AbiFunctionSignature {
  /** The keyword the signature starts with, if any. */
  readonly kind?: "function" | "error";
  readonly name: string;
  readonly inputs: readonly AbiParameter[];
  /** The return types. See `AbiSignature#outputs`. */
  readonly outputs: readonly AbiParameter[];
}

/**
 * A parsed human-readable signature of an event.
 */
export interface AbiEventSignature {
  /** The keyword the signature starts with, if any. */
  readonly kind?: "event";
  readonly name: string;
  readonly inputs: readonly AbiParameter[];
  /** Whether the event is anonymous, so it doesn't log its topic. */
  readonly anonymous: boolean;
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

  // Returning here also keeps micro-eth-signer unloaded.
  if (parameters.length === 0) {
    return "0x";
  }

  assertNoDuplicateAbiParameterNames(parameters);

  // The values are normalized sequentially so that, when more than one is
  // invalid, the error reported is always the one of the first.
  const normalizedValues = [];
  for (const [i, parameter] of parameters.entries()) {
    normalizedValues.push(
      await normalizeAbiValue(parameter, values[i], parameter.name ?? `[${i}]`),
    );
  }

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
    // Reached by types that pass validation but the encoder still refuses,
    // such as `uint256[0][]`, whose zero-size element it treats as a DoS risk.
    ensureError(error);
    throw new AbiEncodingFailedError(error);
  }

  return getPrefixedHexString(encoded);
}

/**
 * Parses a human-readable signature, like `transfer(address,uint256)`.
 *
 * It also accepts parameter names, the `indexed` and data location keywords,
 * tuples written as `(...)` or `tuple(...)`, and whole Solidity declarations,
 * like `function balanceOf(address owner) external view returns (uint256);`.
 * Type aliases are normalized, so `uint` becomes `uint256` and `byte` becomes
 * `bytes1`, and function types must be written as `function`. Custom types,
 * like structs or contracts, are only accepted as return types, as resolving
 * them to ABI types needs their definitions.
 *
 * @param signature The signature to parse.
 * @returns The parsed signature.
 * @throws InvalidAbiSignatureError If the signature is invalid.
 */
export function parseAbiSignature(signature: string): AbiSignature {
  return new AbiSignatureParser(signature).parse();
}

/**
 * Parses a human-readable signature of a function or error, like
 * `transfer(address,uint256)` or `error Unauthorized(address)`, accepting the
 * same syntax as `parseAbiSignature`.
 *
 * @param signature The signature to parse.
 * @returns The parsed signature.
 * @throws InvalidAbiSignatureError If the signature is invalid, has no name, or
 * is of an event or a constructor.
 */
export function parseAbiFunctionSignature(
  signature: string,
): AbiFunctionSignature {
  const { kind, name, inputs, outputs, anonymous } =
    parseAbiSignature(signature);

  if (kind === "event" || anonymous === true) {
    throw new InvalidAbiSignatureError(
      signature,
      "it's an event, not a function or error",
    );
  }

  if (kind === "constructor") {
    throw new InvalidAbiSignatureError(
      signature,
      "it's a constructor, not a function or error",
    );
  }

  if (name === "") {
    throw new InvalidAbiSignatureError(signature, "it must include a name");
  }

  return { ...(kind !== undefined && { kind }), name, inputs, outputs };
}

/**
 * Parses a human-readable signature of an event, like
 * `Transfer(address,address,uint256)`, accepting the same syntax as
 * `parseAbiSignature`.
 *
 * @param signature The signature to parse.
 * @returns The parsed signature.
 * @throws InvalidAbiSignatureError If the signature is invalid, has no name, has
 * return types, or is of a function, error or constructor.
 */
export function parseAbiEventSignature(signature: string): AbiEventSignature {
  const { kind, name, inputs, outputs, anonymous } =
    parseAbiSignature(signature);

  if (kind === "function" || kind === "error" || kind === "constructor") {
    throw new InvalidAbiSignatureError(
      signature,
      `it's ${kind === "error" ? "an" : "a"} ${kind}, not an event`,
    );
  }

  if (outputs.length > 0) {
    throw new InvalidAbiSignatureError(
      signature,
      "events can't have return types",
    );
  }

  if (name === "") {
    throw new InvalidAbiSignatureError(signature, "it must include a name");
  }

  return {
    ...(kind !== undefined && { kind }),
    name,
    inputs,
    anonymous: anonymous === true,
  };
}

/**
 * Returns the selector of a function or error: the first 4 bytes of the
 * keccak256 hash of its canonical signature.
 *
 * @param signature The parsed signature.
 * @returns The 4-byte selector, like `0xa9059cbb`.
 */
export async function getAbiSelector(
  signature: AbiFunctionSignature,
): Promise<PrefixedHexString> {
  const hash = await hashCanonicalAbiSignature(signature);

  return bytesToHexString(hash.subarray(0, 4));
}

/**
 * Returns the topic of an event: the keccak256 hash of its canonical
 * signature, which non-anonymous events log as their first topic.
 *
 * @param signature The parsed signature.
 * @returns The 32-byte topic.
 */
export async function getAbiEventTopic(
  signature: AbiEventSignature,
): Promise<PrefixedHexString> {
  return bytesToHexString(await hashCanonicalAbiSignature(signature));
}

export {
  AbiEncodingError,
  AbiEncodingFailedError,
  AbiParametersLengthMismatchError,
  AbiValueOutOfBoundsError,
  DuplicateAbiParameterNameError,
  InvalidAbiSignatureError,
  InvalidAbiValueError,
  UnsupportedAbiTypeError,
  isAbiEncodingError,
  type AbiEncodingErrorKind,
  type AnyAbiEncodingError,
} from "./errors/abi.js";
