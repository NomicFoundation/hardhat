import type { RunOptions } from "./runner.js";
import type { Abi } from "../../../types/artifacts.js";
import type { ChainType } from "../../../types/network.js";
import type { SolidityTestConfig } from "../../../types/test.js";
import type {
  SolidityTestRunnerConfigArgs,
  PathPermission,
  Artifact,
  ObservabilityConfig,
} from "@nomicfoundation/edr";

import {
  opGenesisState,
  opLatestHardfork,
  l1GenesisState,
  l1HardforkLatest,
  IncludeTraces,
  FsAccessPermission,
} from "@nomicfoundation/edr";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";

import { OPTIMISM_CHAIN_TYPE } from "../../constants.js";

import { type Colorizer, formatArtifactId } from "./formatters.js";

function hexStringToBuffer(hexString: string): Buffer {
  return Buffer.from(hexStringToBytes(hexString));
}

export function solidityTestConfigToRunOptions(
  config: SolidityTestConfig,
): RunOptions {
  return config;
}

export function solidityTestConfigToSolidityTestRunnerConfigArgs(
  chainType: ChainType,
  projectRoot: string,
  config: SolidityTestConfig,
  verbosity: number,
  observability?: ObservabilityConfig,
  testPattern?: string,
): SolidityTestRunnerConfigArgs {
  const fsPermissions: PathPermission[] | undefined = [
    config.fsPermissions?.readWriteFile?.map((p) => ({
      access: FsAccessPermission.ReadWriteFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.readFile?.map((p) => ({
      access: FsAccessPermission.ReadFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.writeFile?.map((p) => ({
      access: FsAccessPermission.WriteFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.dangerouslyReadWriteDirectory?.map((p) => ({
      access: FsAccessPermission.DangerouslyReadWriteDirectory,
      path: p,
    })) ?? [],
    config.fsPermissions?.readDirectory?.map((p) => ({
      access: FsAccessPermission.ReadDirectory,
      path: p,
    })) ?? [],
    config.fsPermissions?.dangerouslyWriteDirectory?.map((p) => ({
      access: FsAccessPermission.DangerouslyWriteDirectory,
      path: p,
    })) ?? [],
  ].flat(1);

  const sender: Buffer | undefined =
    config.from === undefined ? undefined : hexStringToBuffer(config.from);
  const txOrigin: Buffer | undefined =
    config.txOrigin === undefined
      ? undefined
      : hexStringToBuffer(config.txOrigin);
  const blockCoinbase: Buffer | undefined =
    config.coinbase === undefined
      ? undefined
      : hexStringToBuffer(config.coinbase);

  const localPredeploys =
    chainType === OPTIMISM_CHAIN_TYPE
      ? opGenesisState(opLatestHardfork())
      : l1GenesisState(l1HardforkLatest());

  let includeTraces: IncludeTraces = IncludeTraces.None;
  if (verbosity >= 5) {
    includeTraces = IncludeTraces.All;
  } else if (verbosity >= 3) {
    includeTraces = IncludeTraces.Failing;
  }

  const blockGasLimit =
    config.blockGasLimit === false ? undefined : config.blockGasLimit;
  const disableBlockGasLimit = config.blockGasLimit === false;

  const blockDifficulty = config.prevRandao;

  const ethRpcUrl = config.forking?.url;
  const forkBlockNumber = config.forking?.blockNumber;
  const rpcEndpoints = config.forking?.rpcEndpoints;

  return {
    projectRoot,
    ...config,
    fsPermissions,
    localPredeploys,
    sender,
    txOrigin,
    blockCoinbase,
    observability,
    testPattern,
    includeTraces,
    blockGasLimit,
    disableBlockGasLimit,
    blockDifficulty,
    ethRpcUrl,
    forkBlockNumber,
    rpcEndpoints,
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

export function warnDeprecatedTestFail(
  artifact: Artifact,
  sourceNameToUserSourceName: Map<string, string>,
  colorizer: Colorizer = chalk,
): void {
  const abi: Abi = JSON.parse(artifact.contract.abi);

  abi.forEach(({ type, name }) => {
    if (
      type === "function" &&
      typeof name === "string" &&
      name.startsWith("testFail")
    ) {
      const formattedLocation = formatArtifactId(
        artifact.id,
        sourceNameToUserSourceName,
      );
      const warningMessage = `${colorizer.yellow("Warning")}: ${name} The support for the prefix \`testFail*\` has been removed. Consider using \`vm.expectRevert()\` for testing reverts in ${formattedLocation}\n`;

      console.warn(warningMessage);
    }
  });
}
