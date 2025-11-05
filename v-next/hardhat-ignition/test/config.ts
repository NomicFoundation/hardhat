import type { KeyListOf } from "./test-helpers/type-helper.js";
import type { HardhatConfig, NetworkConfig } from "hardhat/types/config";

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import "../src/type-extensions.js";

import hardhatIgnition from "../src/index.js";

import { useEphemeralIgnitionProject } from "./test-helpers/use-ignition-project.js";

describe("config", () => {
  describe("loading", () => {
    let loadedOptions: Partial<HardhatConfig["ignition"]>;
    let hardhatNetworkOptions: NetworkConfig;

    beforeEach(async function () {
      const hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatIgnition],
        networks: {
          default: {
            type: "edr-simulated",
            mining: {
              auto: false,
            },
            ignition: {
              maxFeePerGasLimit: 2n,
              maxFeePerGas: 5n,
              maxPriorityFeePerGas: 3n,
              gasPrice: 1n,
              disableFeeBumping: false,
            },
          },
        },
        ignition: {
          requiredConfirmations: 10,
          blockPollingInterval: 100,
          timeBeforeBumpingFees: 60 * 1000,
          maxFeeBumps: 2,
          strategyConfig: {
            create2: {
              salt: "custom-salt",
            },
          },
          disableFeeBumping: true,
        },
      });

      loadedOptions = hre.config.ignition;
      hardhatNetworkOptions = hre.config.networks.default;
    });

    it("should apply requiredConfirmations", async function () {
      assert.equal(loadedOptions.requiredConfirmations, 10);
    });

    it("should apply blockPollingInterval", async function () {
      assert.equal(loadedOptions.blockPollingInterval, 100);
    });

    it("should apply timeBeforeBumpingFees", async function () {
      assert.equal(loadedOptions.timeBeforeBumpingFees, 60 * 1000);
    });

    it("should apply maxFeeBumps", async function () {
      assert.equal(loadedOptions.maxFeeBumps, 2);
    });

    it("should apply strategyConfig", async function () {
      assert.deepStrictEqual(loadedOptions.strategyConfig, {
        create2: { salt: "custom-salt" },
      });
    });

    it("should apply disableFeeBumping at the top level", async function () {
      assert.equal(loadedOptions.disableFeeBumping, true);
    });

    it("should apply maxFeePerGasLimit", async function () {
      assert.equal(hardhatNetworkOptions.ignition.maxFeePerGasLimit, 2n);
    });

    it("should apply maxFeePerGas", async function () {
      assert.equal(hardhatNetworkOptions.ignition.maxFeePerGas, 5n);
    });

    it("should apply maxPriorityFeePerGas", async function () {
      assert.equal(hardhatNetworkOptions.ignition.maxPriorityFeePerGas, 3n);
    });

    it("should apply gasPrice", async function () {
      assert.equal(hardhatNetworkOptions.ignition.gasPrice, 1n);
    });

    it("should apply disableFeeBumping at the network level", async function () {
      assert.equal(hardhatNetworkOptions.ignition.disableFeeBumping, false);
    });

    it("should only have known config", () => {
      const configOptions: KeyListOf<HardhatConfig["ignition"]> = [
        "blockPollingInterval",
        "disableFeeBumping",
        "maxFeeBumps",
        "requiredConfirmations",
        "strategyConfig",
        "timeBeforeBumpingFees",
      ];

      assert.deepStrictEqual(Object.keys(loadedOptions).sort(), configOptions);
    });
  });

  describe("validating", () => {
    useEphemeralIgnitionProject("with-invalid-config");

    it("should throw when given a `requiredConfirmations` value less than 1", async function () {
      const moduleDefinition = buildModule("FooModule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      await assert.isRejected(
        this.ignition.deploy(moduleDefinition, {
          config: {
            requiredConfirmations: 0,
          },
        }),
        `Configured value 'requiredConfirmations' cannot be less than 1. Value given: '0'`,
      );
    });
  });
});
