import type { TestsStream } from "./types.js";
import type { Abi } from "../../../types/artifacts.js";
import type { ChainType } from "../../../types/network.js";
import type { SolidityTestProfileConfig } from "../../../types/test.js";
import type {
  SolidityTestRunnerConfigArgs,
  PathPermission,
  Artifact,
  ObservabilityConfig,
} from "@nomicfoundation/edr";
import type { Writable } from "node:stream";

import { finished } from "node:stream/promises";
import { styleText } from "node:util";

import { FsAccessPermission, CollectStackTraces } from "@nomicfoundation/edr";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";
import { lt } from "semver";

import { ALWAYS_COLLECT_STACK_TRACES_VERBOSITY } from "../../constants.js";
import { resolveHardfork } from "../network-manager/config-resolution.js";
import { getChainGenesisState } from "../network-manager/edr/genesis-state.js";
import {
  getHardforkName,
  warnIfExperimentalHardfork,
} from "../network-manager/edr/utils/hardfork.js";
import { verbosityToIncludeTraces } from "../network-manager/edr/utils/trace-formatters.js";

import { formatArtifactId } from "./formatters.js";

/**
 * The oldest solc version whose sources EDR can parse. Collecting the inline
 * test configuration and the EIP-712 struct definitions requires parsing, and
 * EDR exempts no source from it.
 */
const OLDEST_PARSABLE_SOLC_VERSION = "0.8.0";

interface SolidityTestConfigParams {
  chainType: ChainType;
  projectRoot: string;
  hardfork?: string;
  config: Omit<SolidityTestProfileConfig, "eip712Types">;
  verbosity: number;
  observability?: ObservabilityConfig;
  testPattern?: string;
  excludeTestPattern?: string;
  generateGasReport: boolean;
  testSourcePaths?: Record<string, string>;
  importMappings?: Record<string, string>;
  testProfile?: string;
  declaredTestProfiles?: string[];
}

export async function solidityTestConfigToSolidityTestRunnerConfigArgs({
  chainType,
  projectRoot,
  hardfork,
  config,
  verbosity,
  observability,
  testPattern,
  excludeTestPattern,
  generateGasReport,
  testSourcePaths,
  importMappings,
  testProfile,
  declaredTestProfiles,
}: SolidityTestConfigParams): Promise<SolidityTestRunnerConfigArgs> {
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

  const hexToBytes = (hex: string | undefined) =>
    hex !== undefined ? hexStringToBytes(hex) : undefined;

  const sender = hexToBytes(config.from);
  const txOrigin = hexToBytes(config.txOrigin);
  const blockCoinbase = hexToBytes(config.coinbase);

  const resolvedHardforkName = resolveHardfork(hardfork, chainType);
  warnIfExperimentalHardfork(resolvedHardforkName, chainType);

  const resolvedHardfork = getHardforkName(resolvedHardforkName, chainType);

  const localPredeploys = getChainGenesisState(resolvedHardfork, chainType);

  const includeTraces = verbosityToIncludeTraces(verbosity);

  const blockGasLimit =
    typeof config.blockGasLimit === "number" ||
    typeof config.blockGasLimit === "bigint"
      ? toBigInt(config.blockGasLimit)
      : undefined;
  const disableBlockGasLimit = blockGasLimit === undefined;

  const transactionGasCap =
    typeof config.transactionGasCap === "number" ||
    typeof config.transactionGasCap === "bigint"
      ? toBigInt(config.transactionGasCap)
      : undefined;
  const disableTransactionGasCap = transactionGasCap === undefined;

  const blockDifficulty = config.prevRandao;

  let ethRpcUrl: string | undefined;
  if (config.forking?.url !== undefined) {
    ethRpcUrl = await config.forking.url.get();
  }

  const forkBlockNumber = config.forking?.blockNumber;

  let rpcEndpoints: Record<string, string> | undefined;
  if (config.forking?.rpcEndpoints !== undefined) {
    rpcEndpoints = {};
    for (const [name, configValue] of Object.entries(
      config.forking.rpcEndpoints,
    )) {
      rpcEndpoints[name] = await configValue.get();
    }
  }

  const shouldAlwaysCollectStackTraces =
    verbosity >= ALWAYS_COLLECT_STACK_TRACES_VERBOSITY;

  return {
    projectRoot,
    hardfork: resolvedHardfork,
    ...config,
    fsPermissions,
    localPredeploys,
    sender,
    txOrigin,
    blockCoinbase,
    observability,
    testPattern: testPattern === "" ? undefined : testPattern,
    excludeTestPattern:
      excludeTestPattern === "" ? undefined : excludeTestPattern,
    includeTraces,
    blockGasLimit,
    disableBlockGasLimit,
    transactionGasCap,
    disableTransactionGasCap,
    blockDifficulty,
    ethRpcUrl,
    forkBlockNumber,
    rpcEndpoints,
    generateGasReport,
    collectStackTraces: shouldAlwaysCollectStackTraces
      ? CollectStackTraces.Always
      : CollectStackTraces.OnFailure,
    testSourcePaths,
    importMappings,
    testProfile,
    declaredTestProfiles,
  };
}

export function isTestSuiteArtifact(artifact: Artifact): boolean {
  const bytecode = artifact.contract.bytecode;

  // Skip abstract contracts and interfaces i.e. those with no bytecode
  if (bytecode === "" || bytecode === "0x" || bytecode === undefined) {
    return false;
  }

  const abi: Abi = JSON.parse(artifact.contract.abi);
  return abi.some(({ type, name }) => {
    if (type === "function" && typeof name === "string") {
      return name.startsWith("test") || name.startsWith("invariant");
    }

    return false;
  });
}

/**
 * Writes the test reporter's output to `output` and waits for the test run to
 * complete, returning the error that failed it, if any.
 *
 * @param runStream The runner's stream of test events.
 * @param reporterStream The reporter's stream of output, composed from
 * `runStream`.
 * @param output Where the reporter's output is written to.
 * @returns The error that failed the run, or `undefined` if it succeeded.
 */
export async function writeTestRunOutput(
  runStream: TestsStream,
  reporterStream: NodeJS.ReadableStream,
  output: Writable,
): Promise<unknown> {
  const outputStream = reporterStream.pipe(output);

  // When the runner reports an error it destroys the run stream with it, which
  // also destroys the reporter stream composed from it. `pipe()` neither
  // forwards that error to the output stream nor ends it, so without this
  // listener the reporter stream emits an `error` event with nothing listening,
  // crashing the process, and `finished(outputStream)` below never settles.
  // Attached before any `await` so that it can't miss the event.
  let reporterStreamError: Error | undefined;
  reporterStream.on("error", (error: Error) => {
    reporterStreamError = error;
    if (!outputStream.writableEnded) {
      outputStream.end();
    }
  });

  let runError: unknown;
  try {
    // NOTE: We're awaiting the original run stream to finish to catch any
    // errors produced by the runner.
    await finished(runStream);

    // We also await the output stream to finish, as we want to wait for it
    // to avoid returning before the whole output was generated.
    await finished(outputStream);
  } catch (error) {
    runError = error;
  }

  // Neither await above surfaces an error that reached the reporter stream
  // without failing the run stream, e.g. one thrown by the reporter after the
  // run stream already ended.
  return runError ?? reporterStreamError;
}

export function warnDeprecatedTestFail(
  artifact: Artifact,
  sourceNameToUserSourceName: Map<string, string>,
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
      const warningMessage = `${styleText("yellow", "Warning")}: ${name} The support for the prefix \`testFail*\` has been removed. Consider using \`vm.expectRevert()\` for testing reverts in ${formattedLocation}\n`;

      console.warn(warningMessage);
    }
  });
}

/** A source backing at least one of the test suites a run selected. */
export interface SelectedTestSource {
  /** The solc source name, which EDR keys its sources by. */
  sourceName: string;
  /** The user-facing path of the source. */
  userSourceName: string;
  /** The absolute path of the source on disk. */
  path: string;
  /** The solc version the source's artifact was compiled with. */
  solcVersion: string;
}

export interface TestSourcePathsSelection {
  /**
   * The paths of every selected source, or `undefined` when one of them is too
   * old to parse, which disables collection for the whole run.
   */
  testSourcePaths: Record<string, string> | undefined;
  /**
   * The user-facing paths of the sources that are too old to parse, sorted and
   * deduplicated. Empty when `testSourcePaths` is defined.
   */
  unparsableSources: string[];
}

/**
 * Decides which test source paths to hand EDR.
 *
 * A non-empty map must name every selected source, and EDR rejects the run when
 * one of them is too old to parse. Collection is therefore all or nothing, and a
 * single source older than `OLDEST_PARSABLE_SOLC_VERSION` disables it for the
 * whole run.
 */
export function selectTestSourcePaths(
  sources: SelectedTestSource[],
): TestSourcePathsSelection {
  const unparsableSources = Array.from(
    new Set(
      sources
        .filter(({ solcVersion }) =>
          lt(solcVersion, OLDEST_PARSABLE_SOLC_VERSION),
        )
        .map(({ userSourceName }) => userSourceName),
    ),
  ).sort();

  if (unparsableSources.length > 0) {
    return { testSourcePaths: undefined, unparsableSources };
  }

  return {
    testSourcePaths: Object.fromEntries(
      sources.map(({ sourceName, path }) => [sourceName, path]),
    ),
    unparsableSources,
  };
}

export function warnUnparsableTestSources(userSourceNames: string[]): void {
  const sources = userSourceNames
    .map((userSourceName) => `- ${userSourceName}`)
    .join("\n");
  const warningMessage = `${styleText("yellow", "Warning")}: These test sources were compiled with a Solidity version older than ${OLDEST_PARSABLE_SOLC_VERSION}, which cannot be parsed:\n${sources}\nInline test configuration and the EIP-712 cheatcodes are disabled for this whole run.\n`;

  console.warn(warningMessage);
}

export function warnDeprecatedEip712Types(
  eip712Types: SolidityTestProfileConfig["eip712Types"],
): void {
  if (eip712Types.include.length === 0 && eip712Types.exclude.length === 0) {
    return;
  }

  const warningMessage = `${styleText("yellow", "Warning")}: The \`eip712Types\` Solidity test configuration no longer has any effect, so you can remove it. The EIP-712 cheatcodes now resolve struct names from the sources of the test contract itself and the files it imports.\n`;

  console.warn(warningMessage);
}
