import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertValidationErrors } from "@nomicfoundation/hardhat-test-utils";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { defineChain } from "viem";

import HardhatViem from "../../src/index.js";
import { validateUserConfig } from "../../src/internal/hook-handlers/config.js";

function createViemChain(id: number) {
  return defineChain({
    id,
    name: "Custom network",
    nativeCurrency: { name: "Custom Coin", symbol: "CC", decimals: 18 },
    rpcUrls: { default: { http: [] } },
  });
}

describe("hook-handlers/config", () => {
  describe("validateUserConfig", () => {
    it("should return no errors when there are no chain descriptors", async () => {
      assertValidationErrors(await validateUserConfig({}), []);
    });

    it("should return no errors for chain descriptors without a viemChain", async () => {
      const validationErrors = await validateUserConfig({
        chainDescriptors: { 9876: { name: "Custom network" } },
      });

      assertValidationErrors(validationErrors, []);
    });

    it("should return no errors when the viemChain id matches the chain descriptor's chain id", async () => {
      const validationErrors = await validateUserConfig({
        chainDescriptors: {
          9876: { name: "Custom network", viemChain: createViemChain(9876) },
          "0x2695": {
            name: "Hex custom network",
            viemChain: createViemChain(9877),
          },
        },
      });

      assertValidationErrors(validationErrors, []);
    });

    it("should return an error when the viemChain is not an object", async () => {
      const validationErrors = await validateUserConfig({
        chainDescriptors: {
          9876: {
            name: "Custom network",
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            -- testing an invalid viemChain for js users */
            viemChain: "customNetwork" as any,
          },
        },
      });

      assertValidationErrors(validationErrors, [
        {
          path: ["chainDescriptors", "9876", "viemChain"],
          message: "Expected a viem Chain object",
        },
      ]);
    });

    it("should return an error when the viemChain id is not a number", async () => {
      const validationErrors = await validateUserConfig({
        chainDescriptors: {
          9876: {
            name: "Custom network",
            viemChain: {
              ...createViemChain(9876),
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              -- testing an invalid viemChain id for js users */
              id: 9876n as any,
            },
          },
        },
      });

      assertValidationErrors(validationErrors, [
        {
          path: ["chainDescriptors", "9876", "viemChain", "id"],
          message: "Expected number, received bigint",
        },
      ]);
    });

    it("should return an error when the viemChain id doesn't match the chain descriptor's chain id", async () => {
      const validationErrors = await validateUserConfig({
        chainDescriptors: {
          9876: { name: "Custom network", viemChain: createViemChain(1) },
        },
      });

      assertValidationErrors(validationErrors, [
        {
          path: ["chainDescriptors", "9876", "viemChain", "id"],
          message: "Expected 9876, the chain descriptor's chain id, but got 1",
        },
      ]);
    });
  });

  describe("resolveUserConfig", () => {
    it("should copy the viemChain into the resolved chain descriptors", async () => {
      const viemChain = createViemChain(9876);
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatViem],
        chainDescriptors: {
          9876: { name: "Custom network", viemChain },
          9877: { name: "Network without viemChain" },
        },
      });

      assert.equal(
        hre.config.chainDescriptors.get(9876n)?.viemChain,
        viemChain,
      );
      assert.equal(
        hre.config.chainDescriptors.get(9877n)?.viemChain,
        undefined,
      );
    });
  });
});
