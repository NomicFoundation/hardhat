import type { HardhatEthers } from "../../src/types.js";
import type { ContractRunner, Signer } from "ethers";
import type { JsonRpcServer } from "hardhat/tasks/node";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { HardhatUserConfig, NetworkConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { createJsonRpcServer } from "hardhat/tasks/node";

import { initializeEthers } from "../../src/internal/initialization.js";

import { MockArtifactManager } from "./artifact-manager-mock.js";

export async function initializeTestEthers(
  mockedArtifacts: Array<{ artifactName: string; fileName: string }> = [],
  config: HardhatUserConfig = {},
): Promise<{
  ethers: HardhatEthers;
  provider: EthereumProvider;
  networkName: string;
  networkConfig: NetworkConfig;
  artifactManager: ArtifactManager;
  hre: HardhatRuntimeEnvironment;
}> {
  const hre = await createHardhatRuntimeEnvironment(config);

  const network =
    config.networks?.localhost !== undefined ? "localhost" : "default";

  const connection = await hre.network.connect(network);

  const provider = connection.provider;
  const networkName = connection.networkName;
  const networkConfig = connection.networkConfig;

  const artifactManager = new MockArtifactManager(mockedArtifacts);

  const ethers = await initializeEthers(
    provider,
    connection.networkName,
    connection.networkConfig,
    artifactManager,
  );

  return {
    ethers,
    provider,
    networkName,
    networkConfig,
    artifactManager,
    hre,
  };
}

export async function spawnTestRpcServer(): Promise<JsonRpcServer> {
  const hre = await createHardhatRuntimeEnvironment({});
  const { provider } = await hre.network.connect();
  const server = await createJsonRpcServer(provider);
  await server.listen();

  return server;
}

export function assertWithin(
  value: number | bigint,
  min: number | bigint,
  max: number | bigint,
): void {
  if (value < min || value > max) {
    assert.equal(
      value < min || value > max,
      true,
      `Expected ${value} to be between ${min} and ${max}`,
    );
  }
}

export function assertIsNotNull<T>(
  value: T,
): asserts value is Exclude<T, null> {
  assert.equal(value !== null, true);
}

export function assertIsSigner(
  value: ContractRunner | null,
): asserts value is Signer {
  assertIsNotNull(value);
  assert.equal("getAddress" in value, true);
  assert.equal("signTransaction" in value, true);
}

export async function sleep(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function tryUntil(f: () => any): Promise<void> {
  const maxTries = 20;
  let tries = 0;
  while (tries < maxTries) {
    try {
      await f();
      return;
    } catch {}

    await sleep(50);

    tries++;
  }

  f();
}
