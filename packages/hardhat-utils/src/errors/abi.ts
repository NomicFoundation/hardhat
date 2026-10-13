import { CustomError } from "../error.js";

/**
 * Discriminates the errors that ABI encoding can throw.
 */
export type AbiEncodingErrorKind =
  | "parameters-length-mismatch"
  | "invalid-value"
  | "value-out-of-bounds"
  | "unsupported-type"
  | "duplicate-parameter-name"
  | "encoding-failed";

/**
 * Base class of every error thrown while ABI-encoding values.
 *
 * Consumers should discriminate with `isAbiEncodingError` rather than
 * `instanceof`, so that the checks keep working if more than one copy of this
 * package ends up installed.
 */
export abstract class AbiEncodingError extends CustomError {
  public abstract readonly kind: AbiEncodingErrorKind;
}

/**
 * Thrown when the number of values to encode doesn't match the number of
 * parameters.
 */
export class AbiParametersLengthMismatchError extends AbiEncodingError {
  public readonly kind: "parameters-length-mismatch" =
    "parameters-length-mismatch";

  constructor(
    public readonly expectedLength: number,
    public readonly providedLength: number,
  ) {
    super(
      `Expected ${expectedLength} values to encode, but ${providedLength} were provided.`,
    );
  }
}

/**
 * Thrown when a value can't be encoded as its parameter's Solidity type.
 */
export class InvalidAbiValueError extends AbiEncodingError {
  public readonly kind: "invalid-value" = "invalid-value";

  constructor(
    public readonly path: string,
    public readonly solidityType: string,
    public readonly value: unknown,
    public readonly reason: string,
  ) {
    super(
      `The value provided for the parameter "${path}" of type "${solidityType}" cannot be encoded. Reason: ${reason}.`,
    );
  }
}

/**
 * Thrown when a numeric value is outside the range of its Solidity type.
 */
export class AbiValueOutOfBoundsError extends AbiEncodingError {
  public readonly kind: "value-out-of-bounds" = "value-out-of-bounds";

  constructor(
    public readonly path: string,
    public readonly solidityType: string,
    public readonly value: unknown,
    public readonly min: bigint,
    public readonly max: bigint,
  ) {
    super(
      `The value provided for the parameter "${path}" is out of bounds for the type "${solidityType}". Expected a value between ${min} and ${max}.`,
    );
  }
}

/**
 * Thrown when a parameter's Solidity type can't be encoded at all.
 */
export class UnsupportedAbiTypeError extends AbiEncodingError {
  public readonly kind: "unsupported-type" = "unsupported-type";

  constructor(
    public readonly path: string,
    public readonly solidityType: string,
  ) {
    super(
      `The type "${solidityType}" of the parameter "${path}" is not supported.`,
    );
  }
}

/**
 * Thrown when two parameters, or two components of the same tuple, share a
 * name.
 *
 * Only a hand-written ABI can carry duplicate names; solc never emits one. The
 * encoder's own guard covers named parameters only, and names are stripped
 * before it runs, so it never sees them.
 */
export class DuplicateAbiParameterNameError extends AbiEncodingError {
  public readonly kind: "duplicate-parameter-name" = "duplicate-parameter-name";

  constructor(
    // undefined when the duplicate is between top-level parameters
    public readonly path: string | undefined,
    public readonly duplicatedName: string,
  ) {
    super(
      path === undefined
        ? `Two or more parameters are named "${duplicatedName}".`
        : `Two or more components of the parameter "${path}" are named "${duplicatedName}".`,
    );
  }
}

/**
 * Thrown when the encoder refuses values that already passed validation.
 */
export class AbiEncodingFailedError extends AbiEncodingError {
  public readonly kind: "encoding-failed" = "encoding-failed";

  constructor(cause: Error) {
    // The encoder's messages don't end with a period, so one is added to keep
    // this message punctuated like the rest.
    super(`The values could not be ABI-encoded: ${cause.message}.`, cause);
  }
}

/**
 * The union of every error that ABI encoding can throw.
 */
export type AnyAbiEncodingError =
  | AbiParametersLengthMismatchError
  | InvalidAbiValueError
  | AbiValueOutOfBoundsError
  | UnsupportedAbiTypeError
  | DuplicateAbiParameterNameError
  | AbiEncodingFailedError;

/**
 * Checks whether a value is the ABI encoding error of the given kind.
 *
 * @param error The value to check.
 * @param kind The kind of error to check for.
 * @returns True if the value is an ABI encoding error of that kind.
 */
export function isAbiEncodingError<KindT extends AbiEncodingErrorKind>(
  error: unknown,
  kind: KindT,
): error is Extract<AnyAbiEncodingError, { kind: KindT }> {
  return error instanceof Error && "kind" in error && error.kind === kind;
}
