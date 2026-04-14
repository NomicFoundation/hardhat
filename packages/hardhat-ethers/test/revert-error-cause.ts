import type { HardhatEthers } from "../src/types.js";
import type { JsonRpcServer } from "hardhat/types/network";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { initializeTestEthers, spawnTestRpcServer } from "./helpers/helpers.js";

let ethers: HardhatEthers;

describe("revert error cause chain", () => {
  describe("in-process EDR network", async () => {
    beforeEach(async () => {
      ({ ethers } = await initializeTestEthers([
        { artifactName: "Contract", fileName: "error-messages" },
      ]));
    });

    it("should have SolidityError as the thrown error", async () => {
      const contract = await ethers.deployContract("Contract");

      let caughtError: Error | undefined;
      try {
        await contract.revertsWithReasonString();
      } catch (error) {
        ensureError(error);
        caughtError = error;
      }

      assert.ok(
        caughtError !== undefined && caughtError.name === "SolidityError",
        `Expected SolidityError, got ${caughtError?.name}`,
      );
      assert.ok(
        "code" in caughtError && caughtError.code === 3,
        `Expected error code 3, got ${"code" in caughtError ? String(caughtError.code) : "undefined"}`,
      );
      assert.ok(
        caughtError.message.includes("some reason"),
        `Expected message to include "some reason", got: "${caughtError.message}"`,
      );
    });
  });

  describe("hardhat node (HTTP)", async () => {
    let server: JsonRpcServer;
    let port: number;
    let address: string;

    before(async () => {
      ({ server, port, address } = await spawnTestRpcServer());
    });

    after(async () => {
      await server.close();
    });

    beforeEach(async () => {
      ({ ethers } = await initializeTestEthers(
        [{ artifactName: "Contract", fileName: "error-messages" }],
        {
          networks: {
            localhost: { type: "http", url: `http://${address}:${port}` },
          },
        },
      ));
    });

    it("should have ProviderError as the thrown error", async () => {
      const contract = await ethers.deployContract("Contract");

      let caughtError: Error | undefined;
      try {
        await contract.revertsWithReasonString();
      } catch (error) {
        ensureError(error);
        caughtError = error;
      }

      assert.ok(
        caughtError !== undefined && caughtError.name === "ProviderError",
        `Expected ProviderError, got ${caughtError?.name}`,
      );
      assert.ok(
        "code" in caughtError && caughtError.code === 3,
        `Expected error code 3, got ${"code" in caughtError ? String(caughtError.code) : "undefined"}`,
      );
      assert.ok(
        caughtError.message.includes("some reason"),
        `Expected message to include "some reason", got: "${caughtError.message}"`,
      );
    });
  });
});
