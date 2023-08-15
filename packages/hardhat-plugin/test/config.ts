/* eslint-disable import/no-unused-modules */

import { DeployConfig, buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { KeyListOf } from "./type-helper";
import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("config", () => {
  describe("loading", () => {
    useEphemeralIgnitionProject("with-config");

    let loadedOptions: DeployConfig;

    beforeEach(function () {
      loadedOptions = this.hre.config.ignition;
    });

    it("should apply blockConfirmations", async function () {
      assert.equal(loadedOptions.blockConfirmations, 10);
    });

    it("should apply blockPollingInterval", async function () {
      assert.equal(loadedOptions.blockPollingInterval, 100);
    });

    it("should apply transactionTimeoutInterval", async function () {
      assert.equal(loadedOptions.transactionTimeoutInterval, 60 * 1000);
    });

    it("should only have known config", () => {
      const configOptions: KeyListOf<DeployConfig> = [
        "blockConfirmations",
        "blockPollingInterval",
        "transactionTimeoutInterval",
      ];

      assert.deepStrictEqual(Object.keys(loadedOptions).sort(), configOptions);
    });
  });

  describe("validating", () => {
    useEphemeralIgnitionProject("with-invalid-config");

    it("should throw when given a `blockConfirmations` value less than 1", async function () {
      const moduleDefinition = buildModule("FooModule", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      assert.isRejected(
        this.deploy(moduleDefinition),
        `Configured value 'blockConfirmations' cannot be less than 1. Value given: '0'`
      );
    });
  });
});
