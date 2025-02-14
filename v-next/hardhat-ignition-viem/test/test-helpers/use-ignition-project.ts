import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

import path, { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import hardhatIgnitionViem from "../../src/index.js";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    connection: NetworkConnection;
  }
}

export function useIgnitionProject(fixtureProjectName: string): void {
  let projectPath: string;
  let prevWorkingDir: string;

  beforeEach("Load environment", async function () {
    projectPath = path.join(
      dirname(fileURLToPath(import.meta.url)),
      "../fixture-projects",
      fixtureProjectName,
    );
    prevWorkingDir = process.cwd();
    process.chdir(projectPath);

    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );

    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [...(userConfig.plugins ?? []), hardhatIgnitionViem],
      },
      { config: configPath },
      projectPath,
    );

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
    process.chdir(prevWorkingDir);
  });
}
