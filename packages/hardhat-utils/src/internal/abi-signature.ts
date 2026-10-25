import type { AbiParameter, AbiSignature } from "../abi.js";

import { parseIntType } from "../abi.js";
import { utf8StringToBytes } from "../bytes.js";
import { keccak256 } from "../crypto.js";
import { InvalidAbiSignatureError } from "../errors/abi.js";

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
 * Returns the canonical form of a signature, as used to compute its selector
 * or topic: its name and input types, without spaces nor parameter names.
 *
 * @param signature The parsed signature.
 * @returns The canonical signature, like `transfer(address,uint256)`.
 */
export function getCanonicalAbiSignature({
  name,
  inputs,
}: AbiSignature): string {
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
  signature: AbiSignature,
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
 * A parser of human-readable ABI signatures. See `parseAbiSignature` for the
 * syntax it accepts.
 */
export class AbiSignatureParser {
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

  public parse(): AbiSignature {
    if (DECLARATION_KEYWORDS.has(this.#peek())) {
      this.#position++;
    }

    const name = isWord(this.#peek()) ? this.#next() : "";
    const inputs = this.#parseParameterList();

    // Return types don't affect the signature, so they can't be wrong in a way
    // that matters here, and declarations often return custom types
    this.#allowCustomTypes = true;

    let outputs: AbiParameter[] = [];
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
    throw new InvalidAbiSignatureError(this.#signature, reason);
  }
}

function isElementaryType(word: string): boolean {
  return parseIntType(word) !== undefined || ELEMENTARY_TYPE_PATTERN.test(word);
}

function isWord(token: string): boolean {
  return /^[A-Za-z_$]/.test(token);
}
