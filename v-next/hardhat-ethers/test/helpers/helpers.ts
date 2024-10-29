import type { HardhatEthers } from "../../src/types.js";
import type { ArtifactsManager } from "@ignored/hardhat-vnext/types/artifacts";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type { ContractRunner, Signer } from "ethers";

import assert from "node:assert/strict";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";

import { initializeEthers } from "../../src/internal/initialization.js";

import { MockArtifactsManager } from "./artifact-manager-mock.js";

// TODO: revisit as soon as the V3 node is ready -handle possibility to switch between hardhat node and localhost
export async function initializeTestEthers(
  mockedArtifacts?: Array<{ artifactName: string; fileName: string }>,
): Promise<{
  ethers: HardhatEthers;
  provider: EthereumProvider;
  networkName: string;
  networkConfig: NetworkConfig;
  artifactsManager: ArtifactsManager;
}> {
  const hre = await createHardhatRuntimeEnvironment({});

  const connection = await hre.network.connect();

  const provider = connection.provider;
  const networkName = connection.networkName;
  const networkConfig = connection.networkConfig;

  const artifactsManager = new MockArtifactsManager(mockedArtifacts);

  await provider.request({ method: "hardhat_reset", params: [] });

  const ethers = await initializeEthers(
    provider,
    connection.networkName,
    connection.networkConfig,
    artifactsManager,
  );

  return {
    ethers,
    provider,
    networkName,
    networkConfig,
    artifactsManager,
  };
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
