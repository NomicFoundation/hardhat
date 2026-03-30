import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { HttpProvider } from "../../../../../src/internal/builtin-plugins/network-manager/http-provider.js";
import { JsonRpcServerImplementation } from "../../../../../src/internal/builtin-plugins/node/json-rpc/server.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("JSON-RPC server", function () {
  let hre: HardhatRuntimeEnvironment;

  before(async function () {
    hre = await createHardhatRuntimeEnvironment({});
  });

  it("should respond to a request over the network the same as in memory", async function () {
    const hostname = (await exists("/.dockerenv")) ? "0.0.0.0" : "127.0.0.1";
    const port = 8545;

    const connection = await hre.network.connect();
    const server = new JsonRpcServerImplementation({
      hostname,
      port,
      provider: connection.provider,
    });

    try {
      await server.listen();

      const edrProvider = connection.provider;
      const httpProvider = await HttpProvider.create({
        url: `http://${hostname}:${port}`,
        networkName: connection.networkName,
        timeout: 20_000,
      });

      const httpResponse = await httpProvider.request({
        method: "eth_chainId",
      });
      const edrResponse = await edrProvider.request({
        method: "eth_chainId",
      });

      assert.deepEqual(httpResponse, edrResponse);
    } finally {
      await server.close();
    }
  });
});
