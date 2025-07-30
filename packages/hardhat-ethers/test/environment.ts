import picocolors from "picocolors";
import fs from "fs";
import {
  HardhatNetworkAccountsUserConfig,
  HardhatRuntimeEnvironment,
  HardhatUserConfig,
  HttpNetworkAccountsUserConfig,
} from "hardhat/types";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/internal/type-extensions";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

/**
 * Start a new Hardhat environment for each test
 */
export function useEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  const fixtureProjectPath = path.resolve(
    __dirname,
    "fixture-projects",
    fixtureProjectName
  );

  beforeEach("Loading hardhat environment", function () {
    process.chdir(fixtureProjectPath);
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function () {
    resetHardhatContext();
  });

  afterEach(function () {
    if (this.currentTest?.state === "failed") {
      console.log(
        picocolors.red("Failed in fixture project"),
        picocolors.red(fixtureProjectPath)
      );
    }
  });
}

/**
 * Like useEnvironment, but re-use the environment for the whole suite
 */
export function usePersistentEnvironment(
  fixtureProjectName: string,
  networkName = "hardhat"
) {
  const fixtureProjectPath = path.resolve(
    __dirname,
    "fixture-projects",
    fixtureProjectName
  );

  before("Loading hardhat environment", function () {
    process.chdir(fixtureProjectPath);
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  after("Resetting hardhat", function () {
    resetHardhatContext();
  });

  afterEach(function () {
    if (this.currentTest?.state === "failed") {
      console.log(
        picocolors.red("Failed in fixture project"),
        picocolors.red(fixtureProjectPath)
      );
    }
  });
}

/**
 * Generate a fixture project on runtime with the given parameters,
 * and start a persistent environment in that project.
 */
export function useGeneratedEnvironment<N extends "hardhat" | "localhost">(
  hardhatGasLimit: "default" | "auto" | number,
  localhostGasLimit: "default" | "auto" | number,
  networkName: N,
  accounts?: N extends "hardhat"
    ? HardhatNetworkAccountsUserConfig
    : HttpNetworkAccountsUserConfig
) {
  const fixtureProjectPath = path.resolve(
    __dirname,
    "fixture-projects",
    "generated-fixtures",
    `hardhat-gas-${hardhatGasLimit}-localhost-gas-${localhostGasLimit}`
  );

  before("Loading hardhat environment", function () {
    // remove the directory if it exists and create an empty one
    try {
      fs.unlinkSync(fixtureProjectPath);
    } catch {}
    fs.mkdirSync(fixtureProjectPath, { recursive: true });

    // generate and write the hardhat config
    const hardhatConfigPath = path.resolve(
      fixtureProjectPath,
      "hardhat.config.js"
    );

    const hardhatConfig: HardhatUserConfig = {
      solidity: "0.8.19",
      networks: {
        hardhat: {
          accounts:
            networkName === "hardhat"
              ? (accounts as HardhatNetworkAccountsUserConfig)
              : undefined,
        },
        localhost: {
          accounts:
            networkName === "localhost"
              ? (accounts as HttpNetworkAccountsUserConfig)
              : undefined,
        },
      },
    };
    if (hardhatGasLimit !== "default") {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      hardhatConfig.networks!.hardhat!.gas = hardhatGasLimit;
    }
    if (localhostGasLimit !== "default") {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      hardhatConfig.networks!.localhost!.gas = localhostGasLimit;
    }

    fs.writeFileSync(
      hardhatConfigPath,
      `
require("../../../../src/internal/index");

module.exports = ${JSON.stringify(hardhatConfig, null, 2)}
`
    );

    // generate and write the contracts
    fs.mkdirSync(path.resolve(fixtureProjectPath, "contracts"), {
      recursive: true,
    });

    fs.writeFileSync(
      path.resolve(fixtureProjectPath, "contracts", "Example.sol"),
      `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Example {
  function f() public {}
}
`
    );

    // start the environment
    process.chdir(fixtureProjectPath);
    process.env.HARDHAT_NETWORK = networkName;

    this.env = require("hardhat");
  });

  after("Resetting hardhat", function () {
    resetHardhatContext();
  });

  afterEach(function () {
    if (this.currentTest?.state === "failed") {
      console.log(
        picocolors.red("Failed in fixture project"),
        picocolors.red(fixtureProjectPath)
      );
    }
  });
}
