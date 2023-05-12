import { assert } from "chai";
import { ContractRunner, Signer } from "ethers";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/internal/type-extensions";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  beforeEach("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

export function usePersistentEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  before("Loading hardhat environment", function () {
    process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName));
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  after("Resetting hardhat", function () {
    resetHardhatContext();
  });
}

export function assertWithin(
  value: number | bigint,
  min: number | bigint,
  max: number | bigint
) {
  if (value < min || value > max) {
    assert.fail(`Expected ${value} to be between ${min} and ${max}`);
  }
}

export function assertIsNotNull<T>(
  value: T
): asserts value is Exclude<T, null> {
  assert.isNotNull(value);
}

export function assertIsSigner(
  value: ContractRunner | null
): asserts value is Signer {
  assertIsNotNull(value);
  assert.isTrue("getAddress" in value);
  assert.isTrue("signTransaction" in value);
}
