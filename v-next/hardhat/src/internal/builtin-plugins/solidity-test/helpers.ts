import type { RunOptions } from "./runner.js";
import type { SolidityTestConfig } from "../../../types/config.js";
import type {
  ArtifactId as EdrArtifactId,
  Artifact as EdrArtifact,
  SolidityTestRunnerConfigArgs,
  CachedChains,
  CachedEndpoints,
  PathPermission,
  StorageCachingConfig,
  AddressLabel,
} from "@ignored/edr";

import path from "node:path";

import { hexStringToBytes } from "@ignored/hardhat-vnext-utils/hex";

function hexStringToBuffer(hexString: string): Buffer {
  return Buffer.from(hexStringToBytes(hexString));
}

export function solidityTestConfigToRunOptions(
  config: SolidityTestConfig,
): RunOptions {
  return config;
}

export function solidityTestConfigToSolidityTestRunnerConfigArgs(
  projectRoot: string,
  config: SolidityTestConfig,
): SolidityTestRunnerConfigArgs {
  const fsPermissions: PathPermission[] | undefined = [
    config.fsPermissions?.readWrite?.map((p) => ({ access: 0, path: p })) ?? [],
    config.fsPermissions?.read?.map((p) => ({ access: 0, path: p })) ?? [],
    config.fsPermissions?.write?.map((p) => ({ access: 0, path: p })) ?? [],
  ].flat(1);

  const labels: AddressLabel[] | undefined = config.labels?.map(
    ({ address, label }) => ({
      address: hexStringToBuffer(address),
      label,
    }),
  );

  let rpcStorageCaching: StorageCachingConfig | undefined;
  if (config.rpcStorageCaching !== undefined) {
    let chains: CachedChains | string[];
    if (Array.isArray(config.rpcStorageCaching.chains)) {
      chains = config.rpcStorageCaching.chains;
    } else {
      const rpcStorageCachingChains: "All" | "None" =
        config.rpcStorageCaching.chains;
      switch (rpcStorageCachingChains) {
        case "All":
          chains = 0;
          break;
        case "None":
          chains = 1;
          break;
      }
    }
    let endpoints: CachedEndpoints | string;
    if (config.rpcStorageCaching.endpoints instanceof RegExp) {
      endpoints = config.rpcStorageCaching.endpoints.source;
    } else {
      const rpcStorageCachingEndpoints: "All" | "Remote" =
        config.rpcStorageCaching.endpoints;
      switch (rpcStorageCachingEndpoints) {
        case "All":
          endpoints = 0;
          break;
        case "Remote":
          endpoints = 1;
          break;
      }
    }
    rpcStorageCaching = {
      chains,
      endpoints,
    };
  }

  const sender: Buffer | undefined =
    config.sender === undefined ? undefined : hexStringToBuffer(config.sender);
  const txOrigin: Buffer | undefined =
    config.txOrigin === undefined
      ? undefined
      : hexStringToBuffer(config.txOrigin);
  const blockCoinbase: Buffer | undefined =
    config.blockCoinbase === undefined
      ? undefined
      : hexStringToBuffer(config.blockCoinbase);

  return {
    projectRoot,
    ...config,
    fsPermissions,
    labels,
    sender,
    txOrigin,
    blockCoinbase,
    rpcStorageCaching,
  };
}

/**
 * This function returns the test suite ids associated with the given artifacts.
 * The test suite ID is the relative path of the test file, relative to the
 * project root.
 */
export async function getTestSuiteIds(
  artifacts: EdrArtifact[],
  rootTestFilePaths: string[],
  projectRoot: string,
): Promise<EdrArtifactId[]> {
  const testSources = rootTestFilePaths.map((p) =>
    path.relative(projectRoot, p),
  );

  return artifacts
    .map(({ id }) => id)
    .filter(({ source }) => testSources.includes(source));
}
