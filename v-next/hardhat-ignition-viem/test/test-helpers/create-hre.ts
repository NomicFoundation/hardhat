import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NetworkConnection } from "hardhat/types/network";

import path from "node:path";
import { pathToFileURL } from "node:url";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatIgnitionViem from "../../src/index.js";

export async function createConnection(): Promise<NetworkConnection> {
  const hre = await createHre();
  const connection = await hre.network.connect();

  await connection.provider.request({
    method: "evm_setAutomine",
    params: [true],
  });

  return connection;
}

async function createHre(): Promise<HardhatRuntimeEnvironment> {
  const configPath = path.join(process.cwd(), "hardhat.config.js");
  const { default: userConfig } = await import(pathToFileURL(configPath).href);

  const hre = await createHardhatRuntimeEnvironment(
    {
      ...userConfig,
      plugins: [...(userConfig.plugins ?? []), hardhatIgnitionViem],
    },
    { config: configPath },
    process.cwd(),
  );

  await hre.tasks.getTask("compile").run({ quiet: true });

  return hre;
}
