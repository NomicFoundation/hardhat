/* eslint-disable import/no-unused-modules */
import type { IgnitionWrapperOptions } from "../src/ignition-wrapper";

import { assert } from "chai";
import { BigNumber } from "ethers";

import { useEnvironment } from "./useEnvironment";

describe.skip("config", () => {
  useEnvironment("with-config");

  let loadedOptions: IgnitionWrapperOptions;

  beforeEach(function () {
    loadedOptions = this.hre.ignition.options;
  });

  it("should apply maxRetries", async function () {
    assert.equal(loadedOptions.maxRetries, 1);
  });

  it("should apply gasPriceIncrementPerRetry", async function () {
    assert(BigNumber.isBigNumber(loadedOptions.gasPriceIncrementPerRetry));
    assert(BigNumber.from(loadedOptions.gasPriceIncrementPerRetry).eq(1000));
  });

  it("should apply pollingInterval", async function () {
    assert.equal(loadedOptions.pollingInterval, 4);
  });

  it("should apply eventDuration", async function () {
    assert.equal(loadedOptions.eventDuration, 10000);
  });

  it("should only have known config", () => {
    assert.deepStrictEqual(Object.keys(loadedOptions).sort(), [
      "eventDuration",
      "gasPriceIncrementPerRetry",
      "maxRetries",
      "networkName",
      "pollingInterval",
      "txPollingInterval",
    ]);
  });
});
