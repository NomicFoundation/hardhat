/* eslint-disable @typescript-eslint/consistent-type-assertions -- TODO*/
import { isAddress } from "@ignored/hardhat-vnext-utils/eth";
import {
  bytesToHexString,
  hexStringToBytes,
} from "@ignored/hardhat-vnext-utils/hex";
import * as t from "io-ts";

const ADDRESS_LENGTH_BYTES = 20;
const HASH_LENGTH_BYTES = 32;

export function isBigInt(x: unknown): x is bigint {
  return typeof x === "bigint";
}

export const rpcQuantity: t.Type<bigint, bigint, unknown> = new t.Type<bigint>(
  "QUANTITY",
  isBigInt,
  (u, c) => (isRpcQuantityString(u) ? t.success(BigInt(u)) : t.failure(u, c)),
  t.identity,
);

export const rpcData: t.Type<Buffer, Buffer, unknown> = new t.Type<Buffer>(
  "DATA",
  Buffer.isBuffer,
  (u, c) =>
    isRpcDataString(u)
      ? t.success(Buffer.from(hexStringToBytes(u)))
      : t.failure(u, c),
  t.identity,
);

export const rpcHash: t.Type<Buffer, Buffer, unknown> = new t.Type<Buffer>(
  "HASH",
  (v): v is Buffer => Buffer.isBuffer(v) && v.length === HASH_LENGTH_BYTES,
  (u, c) =>
    isRpcHashString(u)
      ? t.success(Buffer.from(hexStringToBytes(u)))
      : t.failure(u, c),
  t.identity,
);

export const rpcStorageSlot: t.Type<bigint, bigint, unknown> =
  new t.Type<bigint>("Storage slot", isBigInt, validateStorageSlot, t.identity);

// This type is necessary because objects' keys need to be either strings or numbers to be properly handled by the 'io-ts' module.
// If they are not defined as strings or numbers, the type definition will result in an empty object without the required properties.
// For example, instead of displaying { ke1: value1 }, it will display {}
export const rpcStorageSlotHexString: t.Type<string, string, unknown> =
  new t.Type<string>(
    "Storage slot hex string",
    (x): x is string => typeof x === "string",
    (u, c) =>
      validateRpcStorageSlotHexString(u) ? t.success(u) : t.failure(u, c),
    t.identity,
  );

function validateStorageSlot(u: unknown, c: t.Context): t.Validation<bigint> {
  if (typeof u !== "string") {
    return t.failure(
      u,
      c,
      `Storage slot argument must be a string, got '${u as any}'`,
    );
  }

  if (u === "") {
    return t.failure(u, c, "Storage slot argument cannot be an empty string");
  }

  if (u.startsWith("0x")) {
    if (u.length > 66) {
      return t.failure(
        u,
        c,
        `Storage slot argument must have a length of at most 66 ("0x" + 32 bytes), but '${u}' has a length of ${u.length}`,
      );
    }
  } else {
    if (u.length > 64) {
      return t.failure(
        u,
        c,
        `Storage slot argument must have a length of at most 64 (32 bytes), but '${u}' has a length of ${u.length}`,
      );
    }
  }

  if (u.match(/^(0x)?([0-9a-fA-F]){0,64}$/) === null) {
    return t.failure(
      u,
      c,
      `Storage slot argument must be a valid hexadecimal, got '${u}'`,
    );
  }

  return t.success(u === "0x" ? 0n : BigInt(u.startsWith("0x") ? u : `0x${u}`));
}

export const rpcAddress: t.Type<Buffer, Buffer, unknown> = new t.Type<Buffer>(
  "ADDRESS",
  (v): v is Buffer => Buffer.isBuffer(v) && v.length === ADDRESS_LENGTH_BYTES,
  (u, c) =>
    isRpcAddressString(u)
      ? t.success(Buffer.from(hexStringToBytes(u)))
      : t.failure(u, c),
  t.identity,
);

export const rpcUnsignedInteger: t.Type<number, number, unknown> =
  new t.Type<number>(
    "Unsigned integer",
    isInteger,
    (u, c) => (isInteger(u) && u >= 0 ? t.success(u) : t.failure(u, c)),
    t.identity,
  );

export const rpcQuantityAsNumber: t.Type<bigint, bigint, unknown> =
  new t.Type<bigint>(
    "Integer",
    isBigInt,
    (u, c) => (isInteger(u) ? t.success(BigInt(u)) : t.failure(u, c)),
    t.identity,
  );

export const rpcFloat: t.Type<number, number, unknown> = new t.Type<number>(
  "Float number",
  isNumber,
  (u, c) => (typeof u === "number" ? t.success(u) : t.failure(u, c)),
  t.identity,
);

/**
 * Transforms a DATA into a number. It should only be used if you are 100% sure that the data
 * represents a value fits in a number.
 */
export function rpcDataToNumber(data: string): number {
  return Number(rpcDataToBigInt(data));
}

export function rpcDataToBigInt(data: string): bigint {
  return data === "0x" ? 0n : BigInt(data);
}

export function bufferToRpcData(
  buffer: Uint8Array,
  padhexStringToBytes: number = 0,
): string {
  let s = bytesToHexString(buffer);
  if (padhexStringToBytes > 0 && s.length < padhexStringToBytes * 2 + 2) {
    s = `0x${"0".repeat(padhexStringToBytes * 2 + 2 - s.length)}${s.slice(2)}`;
  }
  return s;
}

// Type guards

function validateRpcStorageSlotHexString(u: unknown): u is string {
  return typeof u === "string" && /^0x([0-9a-fA-F]){64}$/.test(u);
}

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
  return typeof u === "string" && isAddress(u);
}

function isInteger(num: unknown): num is number {
  return Number.isInteger(num);
}

function isNumber(num: unknown): num is number {
  return typeof num === "number";
}
