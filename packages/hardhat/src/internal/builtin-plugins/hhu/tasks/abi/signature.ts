import type { AbiParameter } from "@nomicfoundation/hardhat-utils/abi";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { parseIntType } from "@nomicfoundation/hardhat-utils/abi";
import { utf8StringToBytes } from "@nomicfoundation/hardhat-utils/bytes";
import { keccak256 } from "@nomicfoundation/hardhat-utils/crypto";

/**
 * A parameter of a parsed signature.
 */
export interface SignatureParameter extends AbiParameter {
  readonly components?: readonly SignatureParameter[];
  /** Only set for event parameters declared with the `indexed` keyword. */
  readonly indexed?: boolean;
}

/**
 * A parsed function, event, or error signature.
 */
export interface ParsedSignature {
  /** The name, or "" for a bare parameter list, like `(uint256,bool)`. */
  readonly name: string;
  readonly inputs: readonly SignatureParameter[];
  /**
   * The return types, written as `f(uint256)(bool)` or `f(uint256) returns (bool)`.
   * Custom types, like `IPool`, are kept as written, so they must be resolved
   * before decoding.
   */
  readonly outputs: readonly SignatureParameter[];
}

// A word, an array suffix, or any other character, after optional whitespace
const TOKEN_PATTERN = /\s*(?:[A-Za-z_$][\w$]*|\[(?:[1-9]\d*)?\]|\S)/gy;

const ARRAY_SUFFIX_PATTERN = /^\[(?:[1-9]\d*)?\]$/;

const ELEMENTARY_TYPE_PATTERN =
  /^(?:address|bool|string|bytes(?:[1-9]|[12]\d|3[0-2])?)$/;

const DECLARATION_KEYWORDS = new Set(["function", "event", "error"]);

const PARAMETER_MODIFIERS = new Set([
  "indexed",
  "memory",
  "calldata",
  "storage",
]);

/**
 * Parses a human-readable signature, like `transfer(address,uint256)`.
 *
 * It also accepts parameter names, the `indexed` and data location keywords,
 * tuples written as `(...)` or `tuple(...)`, and whole Solidity declarations,
 * like `function balanceOf(address owner) external view returns (uint256);`.
 * Integer type aliases are normalized, so `uint` becomes `uint256`. Custom
 * types, like structs or contracts, are only accepted as return types, as
 * resolving them to ABI types needs their definitions.
 *
 * @param signature The signature to parse.
 * @returns The parsed signature.
 * @throws HardhatError If the signature is invalid.
 */
export function parseSignature(signature: string): ParsedSignature {
  return new SignatureParser(signature).parse();
}

/**
 * Returns the canonical form of a signature, as used to compute its selector
 * or topic: its name and input types, without spaces nor parameter names.
 *
 * @param signature The parsed signature.
 * @returns The canonical signature, like `transfer(address,uint256)`.
 */
export function formatSignature({ name, inputs }: ParsedSignature): string {
  return `${name}(${inputs.map(formatType).join(",")})`;
}

/**
 * Returns the keccak256 hash of a signature's canonical form. Its first 4 bytes
 * are a function's or error's selector, and the whole hash is an event's topic.
 *
 * @param signature The signature to hash.
 * @returns The 32-byte hash.
 * @throws HardhatError If the signature is invalid or has no name.
 */
export async function hashSignature(signature: string): Promise<Uint8Array> {
  const parsed = parseSignature(signature);

  if (parsed.name === "") {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: signature,
      name: "signature",
      reason: "it must include a name",
    });
  }

  return await keccak256(utf8StringToBytes(formatSignature(parsed)));
}

function formatType({ type, components }: SignatureParameter): string {
  if (components === undefined) {
    return type;
  }

  // Keep the array suffix of types like `tuple[2][]`
  return `(${components.map(formatType).join(",")})${type.slice("tuple".length)}`;
}

class SignatureParser {
  readonly #signature: string;
  readonly #tokens: string[];
  #position = 0;
  #allowCustomTypes = false;

  constructor(signature: string) {
    this.#signature = signature;
    this.#tokens = Array.from(signature.matchAll(TOKEN_PATTERN), ([token]) =>
      token.trim(),
    );
  }

  public parse(): ParsedSignature {
    if (DECLARATION_KEYWORDS.has(this.#peek())) {
      this.#position++;
    }

    const name = isWord(this.#peek()) ? this.#next() : "";
    const inputs = this.#parseParameterList();

    // Return types don't affect the signature, so they can't be wrong in a way
    // that matters here, and declarations often return custom types
    this.#allowCustomTypes = true;

    let outputs: SignatureParameter[] = [];
    if (this.#peek() === "(") {
      outputs = this.#parseParameterList();
    } else {
      // Skip a declaration's modifiers, like `external` or `override(A, B)`, as
      // they don't affect the signature
      while (isWord(this.#peek()) && this.#peek() !== "returns") {
        this.#position++;

        if (this.#peek() === "(") {
          this.#skipModifierArguments();
        }
      }

      if (this.#consume("returns")) {
        outputs = this.#parseParameterList();
      }
    }

    // Ignore a declaration's body, or its trailing ";"
    if (!this.#consume("{")) {
      this.#consume(";");

      if (this.#peek() !== "") {
        this.#failUnexpected();
      }
    }

    return { name, inputs, outputs };
  }

  // Skips a parenthesized list that can be nested, like `(getRoleAdmin(role))`
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

  #parseParameterList(): SignatureParameter[] {
    this.#expect("(");

    const parameters: SignatureParameter[] = [];
    if (this.#consume(")")) {
      return parameters;
    }

    do {
      parameters.push(this.#parseParameter());
    } while (this.#consume(","));

    this.#expect(")");

    return parameters;
  }

  #parseParameter(): SignatureParameter {
    let type: string;
    let components: SignatureParameter[] | undefined;

    if (this.#consume("tuple") || this.#peek() === "(") {
      type = "tuple";
      components = this.#parseParameterList();
    } else {
      type = this.#parseTypeName();
    }

    while (ARRAY_SUFFIX_PATTERN.test(this.#peek())) {
      type += this.#next();
    }

    const modifiers: string[] = [];
    while (PARAMETER_MODIFIERS.has(this.#peek())) {
      modifiers.push(this.#next());
    }

    // A type isn't a name, but the next parameter after a missing ","
    const name =
      isWord(this.#peek()) && !isElementaryType(this.#peek())
        ? this.#next()
        : undefined;

    return {
      type,
      ...(components !== undefined && { components }),
      ...(name !== undefined && { name }),
      ...(modifiers.includes("indexed") && { indexed: true }),
    };
  }

  #parseTypeName(): string {
    if (!isWord(this.#peek())) {
      this.#failUnexpected();
    }

    const word = this.#next();
    const intType = parseIntType(word);

    if (intType !== undefined) {
      return `${intType.signed ? "" : "u"}int${intType.bits}`;
    }

    if (isElementaryType(word)) {
      // `address payable` is encoded as `address`
      if (word === "address") {
        this.#consume("payable");
      }

      return word;
    }

    if (!this.#allowCustomTypes) {
      this.#fail(`unknown type "${word}"`);
    }

    // Custom types can be qualified, like `DataTypes.ReserveData`
    let type = word;
    while (this.#consume(".")) {
      if (!isWord(this.#peek())) {
        this.#failUnexpected();
      }

      type += `.${this.#next()}`;
    }

    return type;
  }

  // Returns "" at the end of the signature
  #peek(): string {
    return this.#tokens[this.#position] ?? "";
  }

  #next(): string {
    const token = this.#peek();
    this.#position++;
    return token;
  }

  #consume(token: string): boolean {
    if (this.#peek() !== token) {
      return false;
    }

    this.#position++;
    return true;
  }

  #expect(token: string): void {
    if (!this.#consume(token)) {
      this.#failUnexpected();
    }
  }

  #failUnexpected(): never {
    const token = this.#peek();

    this.#fail(token === "" ? "it's incomplete" : `unexpected "${token}"`);
  }

  #fail(reason: string): never {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: this.#signature,
      name: "signature",
      reason,
    });
  }
}

function isElementaryType(word: string): boolean {
  return parseIntType(word) !== undefined || ELEMENTARY_TYPE_PATTERN.test(word);
}

function isWord(token: string): boolean {
  return /^[A-Za-z_$]/.test(token);
}
