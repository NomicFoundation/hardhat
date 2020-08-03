import { BN, isValidAddress, toBuffer } from "ethereumjs-util";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";

import { CompilerInput, CompilerOutput } from "../stack-traces/compiler-types";

import { InvalidArgumentsError } from "./errors";

function optional<TypeT, OutputT>(
  codec: t.Type<TypeT, OutputT, unknown>,
  name: string = `${codec.name} | undefined`
): t.Type<TypeT | undefined, OutputT | undefined, unknown> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | undefined => u === undefined || codec.is(u),
    (u, c) => (u === undefined ? t.success(u) : codec.validate(u, c)),
    (a) => (a === undefined ? undefined : codec.encode(a))
  );
}

const isRpcQuantityString = (u: unknown) =>
  typeof u === "string" &&
  u.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) !== null;

const isRpcDataString = (u: unknown) =>
  typeof u === "string" && u.match(/^0x(?:[0-9a-fA-F]{2})*$/) !== null;

const isRpcHashString = (u: unknown) =>
  typeof u === "string" && u.length === 66 && isRpcDataString(u);

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
  Buffer.isBuffer,
  (u, c) => (isRpcHashString(u) ? t.success(toBuffer(u)) : t.failure(u, c)),
  t.identity
);

export const rpcUnknown = t.unknown;

export const rpcAddress = new t.Type<Buffer>(
  "ADDRESS",
  Buffer.isBuffer,
  (u, c) =>
    typeof u === "string" && isValidAddress(u)
      ? t.success(toBuffer(u))
      : t.failure(u, c),
  t.identity
);

export const logAddress = t.union([
  rpcAddress,
  t.array(rpcAddress),
  t.undefined,
]);

export type LogAddress = t.TypeOf<typeof logAddress>;

export const logTopics = t.union([
  t.array(t.union([t.null, rpcHash, t.array(t.union([t.null, rpcHash]))])),
  t.undefined,
]);

export type LogTopics = t.TypeOf<typeof logTopics>;

export const optionalBlockTag = t.union([
  rpcQuantity,
  t.keyof({
    earliest: null,
    latest: null,
    pending: null,
  }),
  t.undefined,
]);

export type OptionalBlockTag = t.TypeOf<typeof optionalBlockTag>;

export const rpcTransactionRequest = t.type(
  {
    from: rpcAddress,
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    data: optional(rpcData),
    nonce: optional(rpcQuantity),
  },
  "RpcTransactionRequest"
);

export interface RpcTransactionRequestInput {
  from: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  nonce?: string;
}

export type RpcTransactionRequest = t.TypeOf<typeof rpcTransactionRequest>;

export const rpcCallRequest = t.type(
  {
    from: optional(rpcAddress),
    to: optional(rpcAddress),
    gas: optional(rpcQuantity),
    gasPrice: optional(rpcQuantity),
    value: optional(rpcQuantity),
    data: optional(rpcData),
  },
  "RpcCallRequest"
);

export interface RpcCallRequestInput {
  from?: string;
  to: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
}

export type RpcCallRequest = t.TypeOf<typeof rpcCallRequest>;

export const rpcFilterRequest = t.type(
  {
    fromBlock: optionalBlockTag,
    toBlock: optionalBlockTag,
    address: logAddress,
    topics: logTopics,
    blockHash: optional(rpcHash),
  },
  "RpcFilterRequest"
);

export interface RpcSubscribe {
  request: RpcFilterRequest;
}

export type OptionalRpcFilterRequest = t.TypeOf<
  typeof optionalRpcFilterRequest
>;

export const optionalRpcFilterRequest = t.union([
  rpcFilterRequest,
  t.undefined,
]);

export type RpcSubscribeRequest = t.TypeOf<typeof rpcSubscribeRequest>;

export const rpcSubscribeRequest = t.keyof(
  {
    newHeads: null,
    newPendingTransactions: null,
    logs: null,
  },
  "RpcSubscribe"
);

export type RpcFilterRequest = t.TypeOf<typeof rpcFilterRequest>;

export const rpcCompilerInput = t.type(
  {
    language: t.string,
    sources: t.any,
    settings: t.any,
  },
  "RpcCompilerInput"
);

export type RpcCompilerInput = t.TypeOf<typeof rpcCompilerInput>;

export const rpcCompilerOutput = t.type(
  {
    sources: t.any,
    contracts: t.any,
  },
  "RpcCompilerOutput"
);

export type RpcCompilerOutput = t.TypeOf<typeof rpcCompilerOutput>;

export function validateParams(params: any[]): [];

export function validateParams(
  params: any[],
  addr: typeof rpcAddress,
  data: typeof rpcData
): [Buffer, Buffer];

export function validateParams(
  params: any[],
  addr: typeof rpcAddress,
  block: typeof optionalBlockTag
): [Buffer, OptionalBlockTag];

export function validateParams(
  params: any[],
  addr: typeof rpcAddress,
  slot: typeof rpcQuantity,
  block: typeof optionalBlockTag
): [Buffer, BN, OptionalBlockTag];

export function validateParams(params: any[], data: typeof rpcData): [Buffer];

export function validateParams(
  params: any[],
  tx: typeof rpcTransactionRequest
): [RpcTransactionRequest];

export function validateParams(
  params: any[],
  call: typeof rpcCallRequest,
  block: typeof optionalBlockTag
): [RpcCallRequest, OptionalBlockTag];

export function validateParams(
  params: any[],
  call: typeof rpcTransactionRequest,
  block: typeof optionalBlockTag
): [RpcTransactionRequest, OptionalBlockTag];

export function validateParams(params: any[], num: typeof t.number): [number];

export function validateParams(
  params: any[],
  hash: typeof rpcHash,
  bool: typeof t.boolean
): [Buffer, boolean];

export function validateParams(
  params: any[],
  tag: typeof optionalBlockTag,
  bool: typeof t.boolean
): [OptionalBlockTag, boolean];

export function validateParams(
  params: any[],
  num: typeof rpcQuantity,
  bool: typeof t.boolean
): [BN, boolean];

export function validateParams(params: any[], num: typeof rpcQuantity): [BN];

export function validateParams(
  params: any[],
  hash: typeof rpcHash,
  num: typeof rpcQuantity
): [Buffer, BN];

export function validateParams(
  params: any[],
  num1: typeof rpcQuantity,
  num2: typeof rpcQuantity
): [BN, BN];

export function validateParams(
  params: any[],
  addr: typeof rpcAddress,
  data: typeof rpcUnknown
): [Buffer, any];

export function validateParams(
  params: any[],
  filterRequest: typeof rpcFilterRequest
): [RpcFilterRequest];

export function validateParams(
  params: any[],
  subscribeRequest: typeof rpcSubscribeRequest,
  optionalFilterRequest: typeof optionalRpcFilterRequest
): [RpcSubscribeRequest, OptionalRpcFilterRequest];

export function validateParams(params: any[], number: typeof rpcQuantity): [BN];

export function validateParams(
  params: any[],
  compilerVersion: typeof t.string,
  compilerInput: typeof rpcCompilerInput,
  compilerOutput: typeof rpcCompilerOutput
): [string, CompilerInput, CompilerOutput];

// tslint:disable only-buidler-error

export function validateParams(params: any[], ...types: Array<t.Type<any>>) {
  if (types === undefined && params.length > 0) {
    throw new InvalidArgumentsError(
      `No argument was expected and got ${params.length}`
    );
  }

  let optionalParams = 0;
  for (let i = types.length - 1; i >= 0; i--) {
    if (types[i].is(undefined)) {
      optionalParams += 1;
    } else {
      break;
    }
  }

  if (optionalParams === 0) {
    if (params.length !== types.length) {
      throw new InvalidArgumentsError(
        `Expected exactly ${types.length} arguments and got ${params.length}`
      );
    }
  } else {
    if (
      params.length > types.length ||
      params.length < types.length - optionalParams
    ) {
      throw new InvalidArgumentsError(
        `Expected between ${types.length - optionalParams} and ${
          types.length
        } arguments and got ${params.length}`
      );
    }
  }

  const decoded: any[] = [];
  for (let i = 0; i < types.length; i++) {
    const result = types[i].decode(params[i]);

    if (result.isLeft()) {
      throw new InvalidArgumentsError(
        `Errors encountered in param ${i}: ${PathReporter.report(result).join(
          ", "
        )}`
      );
    }

    decoded.push(result.value);
  }
  return decoded;
}
