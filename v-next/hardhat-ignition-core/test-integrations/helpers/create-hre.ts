import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NetworkConnection } from "hardhat/types/network";

import path from "node:path";
import { pathToFileURL } from "node:url";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { EIP1193JsonRpcClient } from "../../src/internal/execution/jsonrpc-client.js";

export async function createConnection(): Promise<NetworkConnection> {
  const hre = await createHre();
  const connection = await hre.network.connect();

  await connection.provider.request({
    method: "evm_setAutomine",
    params: [true],
  });

  return connection;
}

export async function createHre(): Promise<HardhatRuntimeEnvironment> {
  const configPath = path.join(process.cwd(), "hardhat.config.js");
  const { default: userConfig } = await import(pathToFileURL(configPath).href);

  const hre = await createHardhatRuntimeEnvironment(
    {
      ...userConfig,
      plugins: [...(userConfig.plugins ?? [])],
    },
    { config: configPath },
    process.cwd(),
  );

  const connection = await hre.network.connect();

  await connection.provider.request({
    method: "evm_setAutomine",
    params: [true],
  });

  return hre;
}

export async function createClient(
  config: {
    maxFeePerGasLimit?: bigint;
    maxPriorityFeePerGas?: bigint;
    gasPrice?: bigint;
  } = {},
): Promise<{
  client: EIP1193JsonRpcClient;
  hre: HardhatRuntimeEnvironment;
  connection: NetworkConnection;
}> {
  const hre = await createHre();
  const connection = await hre.network.connect();
  const client = new EIP1193JsonRpcClient(connection.provider, config);
  return {
    client,
    hre,
    connection,
  };
}
