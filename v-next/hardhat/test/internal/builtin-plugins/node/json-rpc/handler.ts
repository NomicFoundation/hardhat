import type { JsonRpcRequest } from "../../../../../src/types/providers.js";

import assert from "node:assert/strict";
import http from "node:http";
import { after, before, describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import {
  isFailedJsonRpcResponse,
  isJsonRpcResponse,
} from "../../../../../src/internal/builtin-plugins/network-manager/json-rpc.js";
import {
  InternalError,
  InvalidJsonInputError,
  InvalidRequestError,
  MethodNotFoundError,
} from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { JsonRpcServerImplementation } from "../../../../../src/internal/builtin-plugins/node/json-rpc/server.js";
import { MockEthereumProvider } from "../../../../utils.js";

describe("JSON-RPC handler", async function () {
  const hostname = (await exists("/.dockerenv")) ? "0.0.0.0" : "127.0.0.1";
  const port = 8546;
  const provider = new MockEthereumProvider({
    eth_chainId: "0x7a69", // 31337 in hex
    plainError: () => {
      throw new Error("plain JS error");
    },
    methodNotFound: () => {
      throw new MethodNotFoundError();
    },
    topLevelTxHash: () => {
      const err = new InternalError();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow in test
      (err as any).transactionHash = "0xfeed";
      throw err;
    },
    dataAsString: () => {
      const err = new InternalError();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow in test
      (err as any).data = "0xbadbeef";
      throw err;
    },
    dataWithTxHash: () => {
      const err = new InternalError();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow in test
      (err as any).data = { data: null, transactionHash: "0xdead" };
      throw err;
    },
    dataWithData: () => {
      const err = new InternalError();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow in test
      (err as any).data = { data: "0xc0ffee" };
      throw err;
    },
    dataWithBoth: () => {
      const err = new InternalError();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allow in test
      (err as any).data = {
        transactionHash: "0xbeef",
        data: "0xabad1dea",
      };
      throw err;
    },
  });
  const server = new JsonRpcServerImplementation({
    hostname,
    port,
    provider,
  });

  before(async function () {
    await server.listen();
  });

  after(async function () {
    await server.close();
  });

  it("should respond to a request with undefined params", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "eth_chainId",
      id: 1,
      // no params provided
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(isJsonRpcResponse(rpcRes), "Expected a valid JSON-RPC response");

    if ("error" in rpcRes) {
      assert.fail(`Request failed: ${rpcRes.error.message}`);
    }

    assert.equal(rpcRes.jsonrpc, "2.0");
    assert.equal(rpcRes.id, 1);
    assert.equal(Number(rpcRes.result), 31337);
  });

  it("should return a parse error for an invalid JSON input", async function () {
    const rpcReq = "{ not valid json }"; // not valid JSON

    const rpcRes = await postRawJsonRpc(hostname, port, rpcReq);

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.equal(rpcRes.error.code, InvalidJsonInputError.CODE);
    assert.match(rpcRes.error.message, /Parse error/);
  });

  it("should return an invalid request error for a non-object JSON input", async function () {
    const rpcReq = "eth_chainId"; // not an object

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.equal(rpcRes.error.code, InvalidRequestError.CODE);
    assert.match(rpcRes.error.message, /Invalid request/);
  });

  it("should return an invalid request error for an invalid json rpc request", async function () {
    const rpcReq = {
      function: "eth_chainId", // wrong property
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.equal(rpcRes.error.code, InvalidRequestError.CODE);
    assert.match(rpcRes.error.message, /Invalid request/);
  });

  it("should wrap plain JS Error into InternalError", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "plainError",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.equal(rpcRes.error.code, InternalError.CODE);
    assert.match(rpcRes.error.message, /Internal error/);
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.ok(
      typeof rpcRes.error.data.message === "string",
      "Expected error data.message to be a string",
    );
    assert.match(rpcRes.error.data.message, /Internal error/);
  });

  it("should pass through ProviderError subclasses unwrapped", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "methodNotFound",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.equal(rpcRes.error.code, MethodNotFoundError.CODE);
    assert.match(rpcRes.error.message, /Method not found/);
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.ok(
      typeof rpcRes.error.data.message === "string",
      "Expected error data.message to be a string",
    );
    assert.match(rpcRes.error.data.message, /Method not found/);
  });

  it("should extract top-level transactionHash", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "topLevelTxHash",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.equal(rpcRes.error.data.txHash, "0xfeed");
    assert.equal(rpcRes.error.data.data, undefined);
  });

  it("should extract data when error.data is a string", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "dataAsString",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.equal(rpcRes.error.data.txHash, undefined);
    assert.equal(rpcRes.error.data.data, "0xbadbeef");
  });

  it("should extract data.transactionHash when present in error.data object", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "dataWithTxHash",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.equal(rpcRes.error.data.txHash, "0xdead");
    assert.equal(rpcRes.error.data.data, undefined);
  });

  it("should extract error.data.data when present in error.data object", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "dataWithData",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.equal(rpcRes.error.data.txHash, undefined);
    assert.equal(rpcRes.error.data.data, "0xc0ffee");
  });

  it("should extract both txHash and data when both are in error.data", async function () {
    const rpcReq: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "dataWithBoth",
      id: 1,
    };

    const rpcRes = await postRawJsonRpc(hostname, port, JSON.stringify(rpcReq));

    assert.ok(
      isJsonRpcResponse(rpcRes) && isFailedJsonRpcResponse(rpcRes),
      "Expected a failed JSON-RPC response",
    );
    assert.ok(
      isObject(rpcRes.error.data),
      "Expected error data to be an object",
    );
    assert.equal(rpcRes.error.data.txHash, "0xbeef");
    assert.equal(rpcRes.error.data.data, "0xabad1dea");
  });
});

async function postRawJsonRpc(
  hostname: string,
  port: number,
  rawBody: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname,
        port,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 500,
      },
      (res) => {
        res.setEncoding("utf8");
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.once("error", reject);
    req.once("timeout", reject);
    req.write(rawBody);
    req.end();
  });
}
