// import type { ZodType } from "zod";

// import { isAddress, isHash } from "@ignored/hardhat-vnext-utils/eth";
// import { hexStringToBytes } from "@ignored/hardhat-vnext-utils/hex";
// import { conditionalUnionType } from "@ignored/hardhat-vnext-zod-utils";
// import { z } from "zod";

// const ADDRESS_LENGTH_BYTES = 20;
// const HASH_LENGTH_BYTES = 32;

// export const rpcQuantity: ZodType<bigint> = conditionalUnionType(
//   [
//     [isBigInt, z.bigint()],
//     [isRpcQuantityString, z.string()],
//   ],
//   "Expected a bigint or a valid RPC quantity string",
// ).transform((v) => (typeof v === "string" ? BigInt(v) : v));

// export const rpcAny: ZodType<any> = z.any();

// export const rpcData: ZodType<Uint8Array> = conditionalUnionType(
//   [
//     [Buffer.isBuffer, z.instanceof(Uint8Array)],
//     [isRpcDataString, z.string()],
//   ],
//   "Expected a Buffer or a valid RPC data string",
// ).transform((v) => (typeof v === "string" ? hexStringToBytes(v) : v));

// export const rpcHash: ZodType<Uint8Array> = conditionalUnionType(
//   [
//     [
//       (data) => Buffer.isBuffer(data) && data.length === HASH_LENGTH_BYTES,
//       z.instanceof(Uint8Array),
//     ],
//     [isHash, z.string()],
//   ],
//   "Expected a Buffer with the correct length or a valid RPC hash string",
// ).transform((v) =>
//   typeof v === "string" ? Buffer.from(hexStringToBytes(v)) : v,
// );

// export const rpcAddress: ZodType<Uint8Array> = conditionalUnionType(
//   [
//     [
//       (data) => Buffer.isBuffer(data) && data.length === ADDRESS_LENGTH_BYTES,
//       z.instanceof(Uint8Array),
//     ],
//     [isAddress, z.string()],
//   ],
//   "Expected a Buffer with correct length or a valid RPC address string",
// ).transform((v) => (typeof v === "string" ? hexStringToBytes(v) : v));

// function isRpcQuantityString(u: unknown): u is string {
//   return (
//     typeof u === "string" &&
//     u.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) !== null
//   );
// }

// function isRpcDataString(u: unknown): u is string {
//   return typeof u === "string" && u.match(/^0x(?:[0-9a-fA-F]{2})*$/) !== null;
// }

// function isBigInt(x: unknown): x is bigint {
//   return typeof x === "bigint";
// }
