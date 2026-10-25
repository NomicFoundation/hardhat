import type { AbiParameter, AbiSignature } from "../abi.js";

import { parseIntType } from "../abi.js";
import { utf8StringToBytes } from "../bytes.js";
import { keccak256 } from "../crypto.js";
import { InvalidAbiSignatureError } from "../errors/abi.js";

import { parseFixedBytesType } from "./abi.js";

// A word, an array suffix, or any other character, after optional whitespace
const TOKEN_PATTERN = /\s*(?:[A-Za-z_$][\w$]*|\[(?:[1-9]\d*)?\]|\S)/gy;

const ARRAY_SUFFIX_PATTERN = /^\[(?:[1-9]\d*)?\]$/;

// The elementary types that aren't integers nor fixed-size bytes
const ELEMENTARY_TYPE_NAMES = new Set([
  "address",
  "bool",
  "string",
  "bytes",
  "function",
]);

// The type aliases other than the integer ones, which `parseIntType` handles
const TYPE_ALIASES = new Map([["byte", "bytes1"]]);

const DATA_LOCATIONS = new Set(["memory", "calldata", "storage"]);

// The keywords that can't be parameter names. Others, like `error` or `from`,
// are only keywords in some contexts, so they can.
const RESERVED_KEYWORDS = new Set([
  "payable",
  "indexed",
  "anonymous",
  "memory",
  "calldata",
  "storage",
  "returns",
  "function",
  "event",
  "constructor",
]);

const UNKNOWN_TYPE_HINT =
  "write structs as tuples like (address,uint256), contracts as address, enums as uint8 and user-defined value types as their underlying type";

/**
 * Returns the canonical form of a signature, as used to compute its selector
 * or topic: its name and input types, without spaces nor parameter names.
 *
 * @param signature The parsed signature.
 * @returns The canonical signature, like `transfer(address,uint256)`.
 */
export function getCanonicalAbiSignature({
  name,
  inputs,
}: Pick<AbiSignature, "name" | "inputs">): string {
  return `${name}(${inputs.map(getCanonicalAbiType).join(",")})`;
}

/**
 * Returns the keccak256 hash of a signature's canonical form. Its first 4 bytes
 * are a function's or error's selector, and the whole hash is an event's topic.
 *
 * @param signature The parsed signature.
 * @returns The 32-byte hash.
 */
export async function hashCanonicalAbiSignature(
  signature: Pick<AbiSignature, "name" | "inputs">,
): Promise<Uint8Array> {
  return await keccak256(
    utf8StringToBytes(getCanonicalAbiSignature(signature)),
  );
}

function getCanonicalAbiType({ type, components }: AbiParameter): string {
  if (components === undefined) {
    return type;
  }

  // Keep the array suffix of types like `tuple[2][]`
  return `(${components.map(getCanonicalAbiType).join(",")})${type.slice("tuple".length)}`;
}

/**
 * A parser of human-readable ABI signatures, or of a single parameter of one.
 * See `parseAbiSignature` for the syntax it accepts.
 */
export class AbiSignatureParser {
  /** The signature or parameter being parsed, used to report errors. */
  readonly #input: string;

  /** The input split into words, array suffixes and single characters. */
  readonly #tokens: string[];

  /** The index of the current token, the next one to read. */
  #position = 0;

  /** Whether custom types, like `IPool`, are accepted. Only outputs can be. */
  #allowCustomTypes = false;

  /**
   * Splits the input into tokens. Call `parse` to parse it as a signature, or
   * `parseSingleParameter` to parse it as a parameter.
   */
  constructor(input: string) {
    this.#input = input;
    this.#tokens = Array.from(input.matchAll(TOKEN_PATTERN), ([token]) =>
      token.trim(),
    );
  }

  /** Parses the whole input as a single parameter, like `uint256 amount`. */
  public parseSingleParameter(): AbiParameter {
    const parameter = this.#parseParameter();

    if (this.#peek() !== "") {
      this.#fail("it must be a single type, like uint256 or (address,bool)[]");
    }

    return parameter;
  }

  /** Parses the whole input as a signature, like `transfer(address,uint)`. */
  public parse(): AbiSignature {
    const kind = this.#parseDeclarationKeyword();

    // A constructor has no name
    const name =
      kind !== "constructor" && isWord(this.#peek()) ? this.#next() : "";

    if (name === "" && kind !== undefined && kind !== "constructor") {
      this.#fail("it must include a name");
    }

    const inputs = this.#parseParameterList();

    let outputs: AbiParameter[] = [];
    let anonymous = false;

    if (kind === "event") {
      anonymous = this.#consume("anonymous");
    } else if (kind !== "error") {
      // Return types don't affect the signature, so they can't be wrong in a
      // way that matters here, and declarations often return custom types
      this.#allowCustomTypes = true;

      if (this.#peek() === "(") {
        outputs = this.#parseParameterList();
      } else {
        // Skip a declaration's modifiers, like `external` or `override(A, B)`,
        // as they don't affect the signature
        while (isWord(this.#peek()) && this.#peek() !== "returns") {
          if (this.#next() === "anonymous") {
            anonymous = true;
          }

          if (this.#peek() === "(") {
            this.#skipModifierArguments();
          }
        }

        if (this.#consume("returns")) {
          outputs = this.#parseParameterList();
        }
      }
    }

    // Ignore a function's body, or a declaration's trailing ";"
    if (kind === "event" || kind === "error" || !this.#consume("{")) {
      this.#consume(";");

      if (this.#peek() !== "") {
        this.#failUnexpected();
      }
    }

    return {
      ...(kind !== undefined && { kind }),
      name,
      inputs,
      outputs,
      ...(anonymous && { anonymous }),
    };
  }

  /** Consumes the keyword that starts a declaration, if any, and returns it. */
  #parseDeclarationKeyword(): AbiSignature["kind"] {
    const keyword = this.#peek();

    // `error` can also be a function's name, like in `error(string)`, as it
    // isn't reserved. It starts a declaration only when a name follows it.
    if (
      keyword === "function" ||
      keyword === "event" ||
      keyword === "constructor" ||
      (keyword === "error" && isWord(this.#peek(1)))
    ) {
      this.#position++;
      return keyword;
    }

    return undefined;
  }

  /**
   * Skips a modifier's arguments: a parenthesized list that can be nested,
   * like `(getRoleAdmin(role))`.
   */
  #skipModifierArguments(): void {
    let depth = 0;

    do {
      const token = this.#next();

      if (token === "") {
        this.#failUnexpected();
      } else if (token === "(") {
        depth++;
      } else if (token === ")") {
        depth--;
      }
    } while (depth > 0);
  }

  /** Parses a parenthesized and comma-separated list of parameters. */
  #parseParameterList(): AbiParameter[] {
    this.#expect("(");

    const parameters: AbiParameter[] = [];
    if (this.#consume(")")) {
      return parameters;
    }

    do {
      parameters.push(this.#parseParameter());
    } while (this.#consume(","));

    this.#expect(")");

    return parameters;
  }

  /** Parses a parameter: its type, array suffixes, modifiers and name. */
  #parseParameter(): AbiParameter {
    let type: string;
    let components: AbiParameter[] | undefined;

    if (this.#consume("tuple") || this.#peek() === "(") {
      type = "tuple";
      components = this.#parseParameterList();
    } else {
      type = this.#parseTypeName();
    }

    while (ARRAY_SUFFIX_PATTERN.test(this.#peek())) {
      type += this.#next();
    }

    // At most one `indexed` and one data location, in any order
    let indexed = false;
    let hasDataLocation = false;
    while (
      (!indexed && this.#peek() === "indexed") ||
      (!hasDataLocation && DATA_LOCATIONS.has(this.#peek()))
    ) {
      if (this.#next() === "indexed") {
        indexed = true;
      } else {
        hasDataLocation = true;
      }
    }

    // A type or a keyword isn't a name, but what follows a missing "," or a
    // repeated modifier
    const name = isParameterName(this.#peek()) ? this.#next() : undefined;

    return {
      type,
      ...(components !== undefined && { components }),
      ...(name !== undefined && { name }),
      ...(indexed && { indexed: true }),
    };
  }

  /**
   * Parses a type name other than a tuple, normalizing aliases. Custom types
   * are only accepted if `#allowCustomTypes` is set.
   */
  #parseTypeName(): string {
    if (!isWord(this.#peek())) {
      this.#failUnexpected();
    }

    const word = this.#next();
    const intType = parseIntType(word);

    if (intType !== undefined) {
      return `${intType.signed ? "" : "u"}int${intType.bits}`;
    }

    const alias = TYPE_ALIASES.get(word);
    if (alias !== undefined) {
      return alias;
    }

    if (isElementaryType(word)) {
      // `address payable` is encoded as `address`
      if (word === "address") {
        this.#consume("payable");
      }

      // A function type is encoded as `function`, whatever its parameters
      if (word === "function" && this.#peek() === "(") {
        this.#fail('write function types as just "function"');
      }

      return word;
    }

    // Custom types can be qualified, like `DataTypes.ReserveData`
    let type = word;
    while (this.#consume(".")) {
      if (!isWord(this.#peek())) {
        this.#failUnexpected();
      }

      type += `.${this.#next()}`;
    }

    if (!this.#allowCustomTypes) {
      this.#fail(`unknown type "${type}"; ${UNKNOWN_TYPE_HINT}`);
    }

    return type;
  }

  /** Returns the token `offset` positions ahead, or "" past the end. */
  #peek(offset = 0): string {
    return this.#tokens[this.#position + offset] ?? "";
  }

  /** Returns the current token and moves past it. */
  #next(): string {
    const token = this.#peek();
    this.#position++;
    return token;
  }

  /** If the current token is the given one, moves past it and returns true. */
  #consume(token: string): boolean {
    if (this.#peek() !== token) {
      return false;
    }

    this.#position++;
    return true;
  }

  /** Moves past the current token, failing if it isn't the given one. */
  #expect(token: string): void {
    if (!this.#consume(token)) {
      this.#failUnexpected();
    }
  }

  /** Fails on the current token, or because the input ended early. */
  #failUnexpected(): never {
    const token = this.#peek();

    this.#fail(token === "" ? "it's incomplete" : `unexpected "${token}"`);
  }

  /** Throws an `InvalidAbiSignatureError` for the given reason. */
  #fail(reason: string): never {
    throw new InvalidAbiSignatureError(this.#input, reason);
  }
}

function isElementaryType(word: string): boolean {
  return (
    ELEMENTARY_TYPE_NAMES.has(word) ||
    TYPE_ALIASES.has(word) ||
    parseIntType(word) !== undefined ||
    parseFixedBytesType(word) !== undefined
  );
}

function isParameterName(token: string): boolean {
  return (
    isWord(token) && !isElementaryType(token) && !RESERVED_KEYWORDS.has(token)
  );
}

function isWord(token: string): boolean {
  return /^[A-Za-z_$]/.test(token);
}
