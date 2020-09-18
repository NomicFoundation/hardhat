import * as t from "io-ts";

import { optional } from "../buidler-evm/provider/input";
import { BuidlerError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

export interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number | string;
}

const successfulJsonRpcResponse = t.type(
  {
    jsonrpc: t.literal("2.0"),
    id: t.union([t.number, t.string]),
    result: t.unknown,
  },
  "SuccessfulJsonRpcResponse"
);

export type SuccessfulJsonRpcResponse = t.TypeOf<
  typeof successfulJsonRpcResponse
>;

const failedJsonRpcResponse = t.type(
  {
    jsonrpc: t.literal("2.0"),
    id: t.union([t.number, t.string, t.null]),
    error: t.type({
      code: t.number,
      message: t.string,
      data: optional(t.unknown),
    }),
  },
  "FailedJsonRpcResponse"
);

export type FailedJsonRpcResponse = t.TypeOf<typeof failedJsonRpcResponse>;

export const jsonRpcResponse = t.union([
  successfulJsonRpcResponse,
  failedJsonRpcResponse,
]);

export type JsonRpcResponse = t.TypeOf<typeof jsonRpcResponse>;

export const batchJsonRpcResponse = t.array(jsonRpcResponse);

export function parseJsonResponse(text: string): JsonRpcResponse {
  try {
    const json = JSON.parse(text);

    if (!isValidJsonResponse(json)) {
      // We are sending the proper error inside the catch part of the statement.
      // We just need to raise anything here.
      // tslint:disable-next-line only-buidler-error
      throw new Error();
    }

    return json;
  } catch (error) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_JSON_RESPONSE, {
      response: text,
    });
  }
}

export function parseBatchJsonResponse(text: string): JsonRpcResponse[] {
  function invalidResponseError() {
    return new BuidlerError(ERRORS.NETWORK.INVALID_JSON_RESPONSE, {
      response: text,
    });
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw invalidResponseError();
  }

  if (!isValidBatchJsonResponse(json)) {
    throw invalidResponseError();
  }
  return json;
}

export function isValidJsonRequest(payload: any): boolean {
  if (payload.jsonrpc !== "2.0") {
    return false;
  }

  if (typeof payload.id !== "number" && typeof payload.id !== "string") {
    return false;
  }

  if (typeof payload.method !== "string") {
    return false;
  }

  if (payload.params !== undefined && !Array.isArray(payload.params)) {
    return false;
  }

  return true;
}

export function isValidJsonResponse(payload: any) {
  return jsonRpcResponse.decode(payload).isRight();
}

export function isValidBatchJsonResponse(payload: any) {
  return batchJsonRpcResponse.decode(payload).isRight();
}

export function isSuccessfulJsonResponse(
  payload: JsonRpcResponse
): payload is SuccessfulJsonRpcResponse {
  return "response" in payload;
}
