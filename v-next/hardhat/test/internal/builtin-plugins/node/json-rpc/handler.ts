import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";
import type { JsonRpcResponse } from "../../../../../src/types/providers.js";

import assert from "node:assert/strict";
import http from "node:http";
import { before, describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { createHardhatRuntimeEnvironment } from "../../../../../src/hre.js";
import { JsonRpcServerImplementation } from "../../../../../src/internal/builtin-plugins/node/json-rpc/server.js";

describe("JSON-RPC handler", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  it("should respond to a request with undefined params", async function () {
    const hostname = (await exists("/.dockerenv")) ? "0.0.0.0" : "127.0.0.1";
    const port = 8546;

    const connection = await hre.network.connect();
    const server = new JsonRpcServerImplementation({
      hostname,
      port,
      provider: connection.provider,
    });

    try {
      await server.listen();

      let resolve: (val?: any) => void;

      const postData = JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        id: 1,
      });

      const promise = new Promise((resolveFunc) => {
        resolve = resolveFunc;
      });

      const req = http.request(
        {
          hostname,
          port,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
          timeout: 10_000,
        },
        (res) => {
          res.on("data", (chunk) => {
            const response = JSON.parse(chunk.toString());

            resolve(response);
          });
        },
      );

      req.on("error", (error) => {
        assert.fail(`Request failed: ${error.message}`);
      });

      req.write(postData);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is correct
      const result = (await promise) as JsonRpcResponse;
      req.end();

      if ("error" in result) {
        assert.fail(`Request failed: ${result.error.message}`);
      }

      assert.equal(result.jsonrpc, "2.0");
      assert.equal(result.id, 1);
      assert.equal(Number(result.result), 31337);
    } finally {
      await server.close();
    }
  });
});
