/* eslint-disable import/no-unused-modules */

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { HardhatConfig } from "hardhat/types";

import { KeyListOf } from "./test-helpers/type-helper";
import { useEphemeralIgnitionProject } from "./test-helpers/use-ignition-project";

describe("config", () => {
  describe("loading", () => {
    useEphemeralIgnitionProject("with-config");

    let loadedOptions: Partial<HardhatConfig["ignition"]>;

    beforeEach(function () {
      loadedOptions = this.hre.config.ignition;
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

    it("should only have known config", () => {
      const configOptions: KeyListOf<HardhatConfig["ignition"]> = [
        "blockPollingInterval",
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
        this.hre.ignition.deploy(moduleDefinition, {
          config: {
            requiredConfirmations: 0,
          },
        }),
        `Configured value 'requiredConfirmations' cannot be less than 1. Value given: '0'`
      );
    });
  });
});
