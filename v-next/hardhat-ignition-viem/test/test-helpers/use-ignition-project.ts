import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatIgnitionViem from "../../src/index.js";

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
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../fixture-projects",
        fixtureProjectName,
      ),
    );

    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatIgnitionViem],
    });

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
