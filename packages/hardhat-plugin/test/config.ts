/* eslint-disable import/no-unused-modules */

import { DeployConfig } from "@ignored/ignition-core";
import { assert } from "chai";

import { KeyListOf } from "./type-helper";
import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("config", () => {
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
