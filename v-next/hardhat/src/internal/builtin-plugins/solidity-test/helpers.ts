import type { RunOptions } from "./runner.js";
import type { ArtifactsManager } from "../../../types/artifacts.js";
import type { SolidityTestConfig } from "../../../types/config.js";
import type {
  Artifact,
  SolidityTestRunnerConfigArgs,
  CachedChains,
  CachedEndpoints,
  PathPermission,
  StorageCachingConfig,
  AddressLabel,
} from "@ignored/edr";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { exists } from "@ignored/hardhat-vnext-utils/fs";
import { hexStringToBytes } from "@ignored/hardhat-vnext-utils/hex";
import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";

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
    config.fsPermissions?.readWrite?.map((path) => ({ access: 0, path })) ?? [],
    config.fsPermissions?.read?.map((path) => ({ access: 0, path })) ?? [],
    config.fsPermissions?.write?.map((path) => ({ access: 0, path })) ?? [],
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

export async function getArtifacts(
  hardhatArtifacts: ArtifactsManager,
): Promise<Artifact[]> {
  const fqns = await hardhatArtifacts.getAllFullyQualifiedNames();
  const artifacts: Artifact[] = [];

  for (const fqn of fqns) {
    const hardhatArtifact = await hardhatArtifacts.readArtifact(fqn);
    const buildInfo = await hardhatArtifacts.getBuildInfo(fqn);

    if (buildInfo === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.SOLIDITY_TESTS.BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn,
        },
      );
    }

    const id = {
      name: hardhatArtifact.contractName,
      solcVersion: buildInfo.solcVersion,
      source: hardhatArtifact.sourceName,
    };

    const contract = {
      abi: JSON.stringify(hardhatArtifact.abi),
      bytecode: hardhatArtifact.bytecode,
      deployedBytecode: hardhatArtifact.deployedBytecode,
    };

    const artifact = { id, contract };
    artifacts.push(artifact);
  }

  return artifacts;
}

export async function isTestArtifact(
  root: string,
  artifact: Artifact,
): Promise<boolean> {
  const { source } = artifact.id;

  if (!source.endsWith(".t.sol")) {
    return false;
  }

  // NOTE: We also check whether the file exists in the workspace to filter out
  // the artifacts from node modules.
  const sourcePath = resolveFromRoot(root, source);
  const sourceExists = await exists(sourcePath);

  if (!sourceExists) {
    return false;
  }

  return true;
}
