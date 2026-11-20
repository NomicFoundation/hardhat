import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { captureConsole } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("gas-price", () => {
    it("prints the gas price in wei, in decimal", async () => {
      // Each connection is a fresh chain, so they all have this gas price
      const connection = await hre.network.create();
      const gasPrice = await connection.provider.request({
        method: "eth_gasPrice",
      });
      await connection.close();

      assert.ok(
        typeof gasPrice === "string",
        "eth_gasPrice should return a string",
      );

      await hre.tasks.getTask(["utils", "fetch", "gas-price"]).run({});

      assert.deepEqual(capture.lines, [BigInt(gasPrice).toString()]);
    });
  });
});
