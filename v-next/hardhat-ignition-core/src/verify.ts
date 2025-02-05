import type { DeploymentState } from "./internal/execution/types/deployment-state.js";
import type { DeploymentExecutionState } from "./internal/execution/types/execution-state.js";
import type { Artifact, BuildInfo, CompilerInput } from "./types/artifact.js";
import type {
  ChainConfig,
  SourceToLibraryToAddress,
  VerifyInfo,
  VerifyResult,
} from "./types/verify.js";

import path from "node:path";

import { FileNotFoundError } from "@ignored/hardhat-vnext-utils/fs";
import { analyze } from "@nomicfoundation/solidity-analyzer";

import { IgnitionError } from "./errors.js";
import { builtinChains } from "./internal/chain-config.js";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader.js";
import { ERRORS } from "./internal/errors-list.js";
import { encodeDeploymentArguments } from "./internal/execution/abi.js";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers.js";
import { ExecutionResultType } from "./internal/execution/types/execution-result.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "./internal/execution/types/execution-state.js";
import { assertIgnitionInvariant } from "./internal/utils/assertions.js";
import { findExecutionStatesByType } from "./internal/views/find-execution-states-by-type.js";

/**
 * Retrieve the information required to verify all contracts from a deployment on Etherscan.
 *
 * @param deploymentDir - the file directory of the deployment
 * @param customChains - an array of custom chain configurations
 *
 * @beta
 */
export async function* getVerificationInformation(
  deploymentDir: string,
  customChains: ChainConfig[] = [],
  includeUnrelatedContracts = false,
): AsyncGenerator<VerifyResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.VERIFY.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const chainConfig = resolveChainConfig(deploymentState, customChains);

  const deploymentExStates = findExecutionStatesByType(
    ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    deploymentState,
  ).filter((exState) => exState.status === ExecutionStatus.SUCCESS);

  if (deploymentExStates.length === 0) {
    throw new IgnitionError(ERRORS.VERIFY.NO_CONTRACTS_DEPLOYED, {
      deploymentDir,
    });
  }

  for (const exState of deploymentExStates) {
    const verifyInfo = await convertExStateToVerifyInfo(
      exState,
      deploymentLoader,
      includeUnrelatedContracts,
    );

    if (typeof verifyInfo === "string") {
      yield [null, verifyInfo];
      continue;
    }

    const verifyResult: VerifyResult = [chainConfig, verifyInfo];

    yield verifyResult;
  }
}

function resolveChainConfig(
  deploymentState: DeploymentState,
  customChains: ChainConfig[],
) {
  // implementation note:
  // if a user has set a custom chain with the same chainId as a builtin chain,
  // the custom chain will be used instead of the builtin chain
  const chainConfig = [...customChains, ...builtinChains].find(
    (c) => c.chainId === deploymentState.chainId,
  );

  if (chainConfig === undefined) {
    throw new IgnitionError(ERRORS.VERIFY.UNSUPPORTED_CHAIN, {
      chainId: deploymentState.chainId,
    });
  }

  return chainConfig;
}

export function getImportSourceNames(
  sourceName: string,
  buildInfo: BuildInfo,
  visited: Record<string, boolean> = {},
): string[] {
  if (visited[sourceName]) {
    return [];
  }

  visited[sourceName] = true;

  const contractSource = buildInfo.input.sources[sourceName].content;
  const { imports } = analyze(contractSource);

  const importSources = imports.map((i) => {
    if (/^\.\.?[\/|\\]/.test(i)) {
      return path.join(path.dirname(sourceName), i).replaceAll("\\", "/");
    }

    return i;
  });

  return [
    ...importSources,
    ...importSources.flatMap((i) =>
      getImportSourceNames(i, buildInfo, visited),
    ),
  ];
}

async function convertExStateToVerifyInfo(
  exState: DeploymentExecutionState,
  deploymentLoader: FileDeploymentLoader,
  includeUnrelatedContracts: boolean = false,
): Promise<VerifyInfo | string> {
  let result: [BuildInfo, Artifact];

  try {
    result = await Promise.all([
      deploymentLoader.readBuildInfo(exState.artifactId),
      deploymentLoader.loadArtifact(exState.artifactId),
    ]);
  } catch (e) {
    assertIgnitionInvariant(
      e instanceof FileNotFoundError,
      `Unexpected error loading build info or artifact for deployment execution state ${
        exState.id
      }: ${e as any}`,
    );

    // if the artifact cannot be found, we cannot verify the contract
    // we return the contract name so the recipient can know which contract could not be verified
    return exState.artifactId;
  }

  const [buildInfo, artifact] = result;

  const { contractName, constructorArgs, libraries } = exState;

  assertIgnitionInvariant(
    exState.result !== undefined &&
      exState.result.type === ExecutionResultType.SUCCESS,
    `Deployment execution state ${exState.id} should have a successful result to retrieve address`,
  );

  const sourceCode = prepareInputBasedOn(buildInfo, artifact, libraries);

  if (!includeUnrelatedContracts) {
    const sourceNames = [
      artifact.sourceName,
      ...getImportSourceNames(artifact.sourceName, buildInfo),
    ];

    for (const source of Object.keys(sourceCode.sources)) {
      if (!sourceNames.includes(source)) {
        delete sourceCode.sources[source];
      }
    }
  }

  const verifyInfo = {
    address: exState.result.address,
    compilerVersion: buildInfo.solcLongVersion.startsWith("v")
      ? buildInfo.solcLongVersion
      : `v${buildInfo.solcLongVersion}`,
    sourceCode: JSON.stringify(sourceCode),
    name: `${artifact.sourceName}:${contractName}`,
    args: encodeDeploymentArguments(artifact, constructorArgs),
  };

  return verifyInfo;
}

function prepareInputBasedOn(
  buildInfo: BuildInfo,
  artifact: Artifact,
  libraries: Record<string, string>,
): CompilerInput {
  const sourceToLibraryAddresses = resolveLibraryInfoForArtifact(
    artifact,
    libraries,
  );

  if (sourceToLibraryAddresses === null) {
    return buildInfo.input;
  }

  const { input } = buildInfo;
  input.settings.libraries = sourceToLibraryAddresses;

  return input;
}

function resolveLibraryInfoForArtifact(
  artifact: Artifact,
  libraries: Record<string, string>,
): SourceToLibraryToAddress | null {
  const sourceToLibraryToAddress: SourceToLibraryToAddress = {};

  for (const [sourceName, refObj] of Object.entries(artifact.linkReferences)) {
    for (const [libName] of Object.entries(refObj)) {
      sourceToLibraryToAddress[sourceName] ??= {};

      const libraryAddress = libraries[libName];

      assertIgnitionInvariant(
        libraryAddress !== undefined,
        `Could not find address for library ${libName}`,
      );

      sourceToLibraryToAddress[sourceName][libName] = libraryAddress;
    }
  }

  if (Object.entries(sourceToLibraryToAddress).length === 0) {
    return null;
  }

  return sourceToLibraryToAddress;
}
