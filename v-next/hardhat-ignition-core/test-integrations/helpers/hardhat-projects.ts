import path from "node:path";
import { fileURLToPath } from "node:url";

declare module "mocha" {
  interface Context {
    hre: any; // TODO: Bring in HardhatRuntimeEnvironment with full Hardhat 3 import
    accounts: string[];
  }
}

export function useHardhatProject(fixtureProjectName: string): void {
  const previousCwd = process.cwd();
  before("Loading Hardhat Runtime Environment", async function () {
    process.chdir(
      `${path.dirname(fileURLToPath(import.meta.url))}/../fixture-projects/${fixtureProjectName}`,
    );

    throw new Error("Not implemented from migration yet");
    this.hre = null; // TODO: use Hardhat 3 setup of HRE here
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
      "evm_snapshot",
    )) as number;
  });

  beforeEach("Revert to snapshot", async function () {
    await this.hre.network.provider.send("evm_revert", [snapshotId]);
    snapshotId = (await this.hre.network.provider.send(
      "evm_snapshot",
    )) as number;

    // Automining is not including in snapshots
    await this.hre.network.provider.send("evm_setAutomine", [true]);
  });

  after(
    "Resetting Hardhat's context and CWD and deleting context fields",
    function () {
      process.chdir(previousCwd);
      // TODO: replace with equivalent from Hardhat 3
      // resetHardhatContext();
      delete (this as any).hre;
      delete (this as any).accounts;
    },
  );
}
