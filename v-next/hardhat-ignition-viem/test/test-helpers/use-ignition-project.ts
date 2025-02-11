import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

import path from "node:path";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    connection: NetworkConnection;
  }
}

export function useIgnitionProject(fixtureProjectName: string): void {
  let previousCwd: string;
  beforeEach("Load environment", async function () {
    previousCwd = process.cwd();

    process.chdir(
      path.join(__dirname, "../fixture-projects", fixtureProjectName),
    );

    const hre = await createHardhatRuntimeEnvironment({});

    await hre.tasks.getTask("compile").run({ quiet: true });

    const connection = await hre.network.connect();

    await connection.provider.request({
      method: "evm_setAutomine",
      params: [true],
    });

    this.hre = hre;
    this.connection = connection;
  });

  afterEach("reset hardhat context", function () {
    process.chdir(previousCwd);
  });
}
