import { BN, bufferToHex, isValidAddress, toBuffer } from "ethereumjs-util";
import * as t from "io-ts";

import { assertHardhatInvariant, HardhatError } from "../../errors";
import { ERRORS } from "../../errors-list";

const ADDRESS_LENGTH_BYTES = 20;
const HASH_LENGTH_BYTES = 32;

export const rpcQuantity = new t.Type<BN>(
  "QUANTITY",
  BN.isBN,
  (u, c) =>
    isRpcQuantityString(u) ? t.success(new BN(toBuffer(u))) : t.failure(u, c),
  t.identity
);

export const rpcData = new t.Type<Buffer>(
  "DATA",
  Buffer.isBuffer,
  (u, c) => (isRpcDataString(u) ? t.success(toBuffer(u)) : t.failure(u, c)),
  t.identity
);

export const rpcHash = new t.Type<Buffer>(
  "HASH",
  (v): v is Buffer => Buffer.isBuffer(v) && v.length === HASH_LENGTH_BYTES,
  (u, c) => (isRpcHashString(u) ? t.success(toBuffer(u)) : t.failure(u, c)),
  t.identity
);

export const rpcStorageSlot = new t.Type<BN>(
  "Storage slot",
  BN.isBN,
  validateStorageSlot,
  t.identity
);

function validateStorageSlot(u: unknown, c: t.Context): t.Validation<BN> {
  if (typeof u !== "string") {
    return t.failure(
      u,
      c,
      `Storage slot argument must be a string, got '${u as any}'`
    );
  }

  if (u.match(/^0x(?:[0-9a-fA-F]*)*$/) === null) {
    return t.failure(
      u,
      c,
      `Storage slot argument must be a valid hexadecimal prefixed with "0x", got '${u}'`
    );
  }

  if (u.length !== 66) {
    return t.failure(
      u,
      c,
      `Storage slot argument must have a length of 66 ("0x" + 32 bytes), but '${u}' has a length of ${u.length}`
    );
  }

  return t.success(new BN(toBuffer(u)));
}

export const rpcAddress = new t.Type<Buffer>(
  "ADDRESS",
  (v): v is Buffer => Buffer.isBuffer(v) && v.length === ADDRESS_LENGTH_BYTES,
  (u, c) => (isRpcAddressString(u) ? t.success(toBuffer(u)) : t.failure(u, c)),
  t.identity
);

export const rpcUnsignedInteger = new t.Type<number>(
  "Unsigned integer",
  isInteger,
  (u, c) => (isInteger(u) && u >= 0 ? t.success(u) : t.failure(u, c)),
  t.identity
);

export const rpcQuantityAsNumber = new t.Type<BN>(
  "Integer",
  BN.isBN,
  (u, c) => (isInteger(u) ? t.success(new BN(u)) : t.failure(u, c)),
  t.identity
);

export const rpcFloat = new t.Type<number>(
  "Float number",
  isNumber,
  (u, c) => (typeof u === "number" ? t.success(u) : t.failure(u, c)),
  t.identity
);

// Conversion functions

/**
 * Transforms a QUANTITY into a number. It should only be used if you are 100% sure that the value
 * fits in a number.
 */
export function rpcQuantityToNumber(quantity: string): number {
  return rpcQuantityToBN(quantity).toNumber();
}

export function rpcQuantityToBN(quantity: string): BN {
  // We validate it in case a value gets here through a cast or any
  if (!isRpcQuantityString(quantity)) {
    throw new HardhatError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
      value: quantity,
    });
  }

  const buffer = toBuffer(quantity);
  return new BN(buffer);
}

export function numberToRpcQuantity(n: number | BN): string {
  assertHardhatInvariant(
    typeof n === "number" || BN.isBN(n),
    "Expected number"
  );

  return `0x${n.toString(16)}`;
}

export function numberToRpcStorageSlot(n: number | BN): string {
  assertHardhatInvariant(
    typeof n === "number" || BN.isBN(n),
    "Expected number"
  );

  return `0x${n.toString(16).padStart(64, "0")}`;
}

/**
 * Transforms a DATA into a number. It should only be used if you are 100% sure that the data
 * represents a value fits in a number.
 */
export function rpcDataToNumber(data: string): number {
  return rpcDataToBN(data).toNumber();
}

export function rpcDataToBN(data: string): BN {
  return new BN(rpcDataToBuffer(data));
}

export function bufferToRpcData(
  buffer: Buffer,
  padToBytes: number = 0
): string {
  let s = bufferToHex(buffer);
  if (padToBytes > 0 && s.length < padToBytes * 2 + 2) {
    s = `0x${"0".repeat(padToBytes * 2 + 2 - s.length)}${s.slice(2)}`;
  }
  return s;
}

export function rpcDataToBuffer(data: string): Buffer {
  // We validate it in case a value gets here through a cast or any
  if (!isRpcDataString(data)) {
    throw new HardhatError(ERRORS.NETWORK.INVALID_RPC_DATA_VALUE, {
      value: data,
    });
  }

  return toBuffer(data);
}

// Type guards

function isRpcQuantityString(u: unknown): u is string {
  return (
    typeof u === "string" &&
    u.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) !== null
  );
}

function isRpcDataString(u: unknown): u is string {
  return typeof u === "string" && u.match(/^0x(?:[0-9a-fA-F]{2})*$/) !== null;
}

function isRpcHashString(u: unknown): u is string {
  return typeof u === "string" && u.length === 66 && isRpcDataString(u);
}

function isRpcAddressString(u: unknown): u is string {
  return typeof u === "string" && isValidAddress(u);
}

function isInteger(num: unknown): num is number {
  return Number.isInteger(num);
}

function isNumber(num: unknown): num is number {
  return typeof num === "number";
}
