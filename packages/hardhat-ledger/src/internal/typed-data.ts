import type { TypedData } from "./dmk-imports.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Parses the `eth_signTypedData_v4` data parameter into the shape the Device
 * Management Kit's Ethereum signer expects, which takes the typed data as-is
 * and does the hashing itself.
 *
 * Only the shape is checked here, plus the two values no later check can catch
 * (see `assertValuesSurvivedParsing`). Whether the device actually signed what
 * the caller sent is checked afterwards, in the handler, by recovering the
 * signer from the signature and the caller's own data.
 *
 * @param data The `data` parameter, either a JSON string or an object.
 *
 * @throws ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM if it is not shaped like
 * EIP-712 typed data.
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
    !isObject(types) ||
    !isObject(message) ||
    typeof primaryType !== "string" ||
    // `Object.hasOwn`: the signer kit resolves the primary type through
    // `Object.prototype` too, so a name like `toString` would look declared.
    !Object.hasOwn(types, primaryType) ||
    !Object.values(types).every(isFieldList)
  ) {
    throwInvalidDataParam();
  }

  assertValuesSurvivedParsing(message);
  assertValuesSurvivedParsing(domain);

  // The domain is passed through as-is, apart from the chain id, so that a
  // field the caller declared in `types.EIP712Domain` is never dropped.
  const normalizedDomain: Record<string, unknown> = { ...domain };

  if (normalizedDomain.chainId !== undefined) {
    normalizedDomain.chainId = toChainId(normalizedDomain.chainId);
  }

  /* eslint-disable @typescript-eslint/consistent-type-assertions -- `types` is
  checked field by field above. The copies matter: the signer kit adds an
  `EIP712Domain` entry to the `types` it is given, and the caller's object must
  not be mutated. */
  return {
    domain: normalizedDomain as TypedData["domain"],
    types: { ...types } as TypedData["types"],
    primaryType,
    message,
  };
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** Whether the value is a list of `{ name, type }` field definitions. */
function isFieldList(fields: unknown): boolean {
  return (
    Array.isArray(fields) &&
    fields.every(
      (field) =>
        isObject(field) &&
        typeof field.name === "string" &&
        typeof field.type === "string",
    )
  );
}

/**
 * Rejects the two values that reach us already damaged. No check after signing
 * can catch them, because the device and our own hasher agree on them.
 *
 * `JSON.parse` turns an integer literal past 2^53 into the nearest double, so
 * the device would sign the rounded value; big integers must be passed as
 * strings. And a lone surrogate is not text: UTF-8 has no encoding for it, so
 * every encoder substitutes something of its own and no two agree on what was
 * signed.
 */
function assertValuesSurvivedParsing(value: unknown): void {
  const pending: unknown[] = [value];
  // A value referenced twice is walked once, and a cycle cannot loop forever.
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
 * The DMK types `domain.chainId` as a number, but a JSON-RPC caller may send it
 * as a decimal or hexadecimal string.
 *
 * Anything that does not survive the round trip exactly is rejected rather than
 * rounded, because the device would otherwise hash a different chain id than
 * the one it was asked to sign for. That includes values at or above 2^53,
 * which EIP-2294 puts out of range anyway.
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

function throwInvalidDataParam(): never {
  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
      .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
  );
}
