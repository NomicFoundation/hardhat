import type { TypedData } from "./dmk-imports.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Parses and validates `eth_signTypedData_v4` input for the DMK.
 *
 * @param data The `data` parameter, either a JSON string or an object.
 *
 * @throws ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM if it is not shaped like
 * EIP-712 typed data.
 * @throws ETH_SIGN_TYPED_DATA_V4_UNSUPPORTED_NAME if it uses a type or field
 * name the signer kit cannot encode as written.
 */
export function toTypedData(data: string | object): TypedData {
  let parsed: unknown;

  try {
    parsed = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throwInvalidDataParam();
  }

  if (!isObject(parsed)) {
    throwInvalidDataParam();
  }

  const { domain, types, primaryType, message } = parsed;

  if (
    !isObject(domain) ||
    !isTypeDefinitions(types) ||
    !isObject(message) ||
    typeof primaryType !== "string" ||
    // Block inherited type names such as `toString`.
    !Object.hasOwn(types, primaryType)
  ) {
    throwInvalidDataParam();
  }

  assertNamesSupported(types);

  assertValuesSurvivedParsing(message);
  assertValuesSurvivedParsing(domain);

  // Preserve every domain field; only normalize the chain ID.
  const normalizedDomain: Record<string, unknown> = { ...domain };

  if (normalizedDomain.chainId !== undefined) {
    normalizedDomain.chainId = toChainId(normalizedDomain.chainId);
  }

  // Copy `types` because the signer kit mutates it.
  return {
    domain: normalizedDomain,
    types: { ...types },
    primaryType,
    message,
  };
}

/** Whether every entry is a list of `{ name, type }` field definitions. */
function isTypeDefinitions(types: unknown): types is TypedData["types"] {
  return (
    isObject(types) &&
    Object.values(types).every(
      (fields) =>
        Array.isArray(fields) &&
        fields.every(
          (field) =>
            isObject(field) &&
            typeof field.name === "string" &&
            typeof field.type === "string",
        ),
    )
  );
}

/**
 * Rejects type and field names that the signer kit's typed-data parser
 * encodes differently from how they are declared, so the device would sign
 * data other than what was requested.
 *
 * The parser copies each type's field list into a plain object and walks its
 * keys. Plain objects list integer-like keys first, assigning `__proto__`
 * sets the prototype instead of adding a key, and a repeated key keeps only
 * its last value. The same happens to type names, which become keys of the
 * same kind of object.
 */
function assertNamesSupported(types: TypedData["types"]): void {
  for (const [typeName, fields] of Object.entries(types)) {
    assertNameSupported(typeName);

    const fieldNames = new Set<string>();

    for (const { name } of fields) {
      assertNameSupported(name);

      if (fieldNames.has(name)) {
        throwUnsupportedName(name);
      }

      fieldNames.add(name);
    }
  }
}

function assertNameSupported(name: string): void {
  // Any all-digit name is rejected, not only those that JavaScript reorders,
  // so the rule stays easy to state.
  if (/^\d+$/.test(name) || name === "__proto__") {
    throwUnsupportedName(name);
  }
}

/**
 * Rejects unsafe integers and lone UTF-16 surrogates. Both lose information
 * before signing, so signature verification cannot detect the change.
 */
function assertValuesSurvivedParsing(value: unknown): void {
  const pending: unknown[] = [value];
  const seen = new Set<object>();

  while (pending.length > 0) {
    const current = pending.pop();

    if (typeof current === "number" && !Number.isSafeInteger(current)) {
      throwInvalidDataParam();
    }

    if (typeof current === "string" && /\p{Surrogate}/u.test(current)) {
      throwInvalidDataParam();
    }

    if (typeof current !== "object" || current === null || seen.has(current)) {
      continue;
    }

    seen.add(current);

    pending.push(
      ...(Array.isArray(current) ? current : Object.values(current)),
    );
  }
}

/**
 * Converts a decimal, hexadecimal, or bigint chain ID to the safe number the
 * DMK requires. Lossy values are rejected.
 */
function toChainId(chainId: unknown): number {
  if (typeof chainId === "number" && Number.isSafeInteger(chainId)) {
    return chainId;
  }

  if (typeof chainId === "bigint" || typeof chainId === "string") {
    // A blank string converts to 0, which would silently sign for chain 0.
    if (typeof chainId === "string" && chainId.trim() === "") {
      throwInvalidDataParam();
    }

    const parsed = Number(chainId);

    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  throwInvalidDataParam();
}

function throwUnsupportedName(name: string): never {
  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
      .ETH_SIGN_TYPED_DATA_V4_UNSUPPORTED_NAME,
    { name },
  );
}

function throwInvalidDataParam(): never {
  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
      .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
  );
}
