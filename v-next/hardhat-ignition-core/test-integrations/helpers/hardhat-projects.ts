import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { resetHardhatContext } from "hardhat/plugins-testing";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    accounts: string[];
  }
}

export function useHardhatProject(fixtureProjectName: string): void {
  const previousCwd = process.cwd();
  before("Loading Hardhat Runtime Environment", async function () {
    process.chdir(`${__dirname}/../fixture-projects/${fixtureProjectName}`);
    this.hre = require("hardhat");
  });

  before("Compiling contracts", async function () {
    await this.hre.run("compile", { quiet: true });
  });

  before("Fetching accounts", async function () {
    this.accounts = (await this.hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];
  });

  let snapshotId: number;

  before("Taking initial snapshot", async function () {
    snapshotId = (await this.hre.network.provider.send(
      "evm_snapshot"
    )) as number;
  });

  beforeEach("Revert to snapshot", async function () {
    await this.hre.network.provider.send("evm_revert", [snapshotId]);
    snapshotId = (await this.hre.network.provider.send(
      "evm_snapshot"
    )) as number;

    // Automining is not including in snapshots
    await this.hre.network.provider.send("evm_setAutomine", [true]);
  });

  after(
    "Resetting Hardhat's context and CWD and deleting context fields",
    function () {
      process.chdir(previousCwd);
      resetHardhatContext();
      delete (this as any).hre;
      delete (this as any).accounts;
    }
  );
}
