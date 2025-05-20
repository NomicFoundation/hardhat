import type { RunOptions } from "./runner.js";
import type { Abi } from "../../../types/artifacts.js";
import type { SolidityTestConfig } from "../../../types/config.js";
import type {
  SolidityTestRunnerConfigArgs,
  CachedChains,
  CachedEndpoints,
  PathPermission,
  StorageCachingConfig,
  AddressLabel,
  Artifact,
} from "@ignored/edr";

import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";

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
  testPattern?: string,
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
    testPattern,
  };
}

export function isTestSuiteArtifact(artifact: Artifact): boolean {
  const abi: Abi = JSON.parse(artifact.contract.abi);
  return abi.some(({ type, name }) => {
    if (type === "function" && typeof name === "string") {
      return name.startsWith("test") || name.startsWith("invariant");
    }
    return false;
  });
}
