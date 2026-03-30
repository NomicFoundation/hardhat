import type { SolidityBuildInfoOutput } from "../../../../types/solidity/solidity-artifacts.js";
import type {
  BuildInfoAndOutput,
  EdrArtifactWithMetadata,
} from "../edr-artifacts.js";
import type { RawInlineOverride } from "./types.js";
import type { ArtifactId, TestFunctionOverride } from "@nomicfoundation/edr";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { bytesToUtf8String } from "@nomicfoundation/hardhat-utils/bytes";

import { getFullyQualifiedName } from "../../../../utils/contract-names.js";

import {
  buildInfoContainsInlineConfig,
  resolveFunctionSelector,
  buildConfigOverride,
  getFunctionFqn,
} from "./helpers.js";
import { extractInlineConfigFromAst } from "./parsing.js";
import { validateInlineOverrides } from "./validation.js";

export type { RawInlineOverride } from "./types.js";
export {
  buildInfoContainsInlineConfig,
  resolveFunctionSelector,
  buildConfigOverride,
  getFunctionFqn,
} from "./helpers.js";
export {
  extractInlineConfigFromAst,
  extractDocText,
  parseInlineConfigLine,
} from "./parsing.js";
export { validateInlineOverrides } from "./validation.js";

interface CollectedOverrides {
  overrides: RawInlineOverride[];
  artifactIdsByFqn: Map<string, ArtifactId>;
  methodIdentifiersByContract: Map<string, Record<string, string>>;
}

/**
 * Extracts per-test inline configuration overrides from the NatSpec comments
 * in the solc AST. It only extracts them from the build info where each
 * test artifact's file was compiled as a root file.
 */
export function getTestFunctionOverrides(
  testSuiteArtifacts: EdrArtifactWithMetadata[],
  buildInfosAndOutputs: BuildInfoAndOutput[],
): TestFunctionOverride[] {
  const allRawOverrides = collectRawOverrides(
    testSuiteArtifacts,
    buildInfosAndOutputs,
  );

  validateInlineOverrides(allRawOverrides.overrides);

  return buildTestFunctionOverrides(allRawOverrides);
}

function collectRawOverrides(
  testSuiteArtifacts: EdrArtifactWithMetadata[],
  buildInfosAndOutputs: BuildInfoAndOutput[],
): CollectedOverrides {
  const overrides: RawInlineOverride[] = [];
  const methodIdentifiersByContract = new Map<string, Record<string, string>>();

  // Note: We group the artifacts by their build info, so that we only process
  // the relevant build infos, and only the root files of each of them.
  //
  // The last part is important, as a test file can be present in multiple build
  // infos in the presence of partial recompilations
  //
  // At the same time, the same root file could have produced multiple test
  // artifacts, so we need a two-level map to avoid processing the root files
  // multiple times.

  // Build lookup structures for fast access
  const artifactsGroupedByBuildInfo = new Map<
    /* buildInfoId */ string,
    Map</* inputSourceName */ string, EdrArtifactWithMetadata[]>
  >();

  const artifactIdsByFqn = new Map<string, ArtifactId>();
  const buildInfoAndOutputById: Map<string, BuildInfoAndOutput> = new Map(
    buildInfosAndOutputs.map((bio) => [bio.buildInfoId, bio]),
  );

  for (const edrArtifactWithMetadata of testSuiteArtifacts) {
    const fqn = getFullyQualifiedName(
      edrArtifactWithMetadata.edrArtifact.id.source,
      edrArtifactWithMetadata.edrArtifact.id.name,
    );

    const buildInfoId = edrArtifactWithMetadata.buildInfoId;
    let artifactsBySource = artifactsGroupedByBuildInfo.get(buildInfoId);

    if (artifactsBySource === undefined) {
      artifactsBySource = new Map();
      artifactsGroupedByBuildInfo.set(buildInfoId, artifactsBySource);
    }

    let artifacts = artifactsBySource.get(
      edrArtifactWithMetadata.edrArtifact.id.source,
    );
    if (artifacts === undefined) {
      artifacts = [];
      artifactsBySource.set(
        edrArtifactWithMetadata.edrArtifact.id.source,
        artifacts,
      );
    }

    artifacts.push(edrArtifactWithMetadata);
    artifactIdsByFqn.set(fqn, edrArtifactWithMetadata.edrArtifact.id);
  }

  for (const [
    buildInfoId,
    artifactsBySource,
  ] of artifactsGroupedByBuildInfo.entries()) {
    const buildInfoAndOutput = buildInfoAndOutputById.get(buildInfoId);
    if (buildInfoAndOutput === undefined) {
      // We can throw for this error for the first artifact with this build info
      // as all of them have the same problem.
      const artifacts = artifactsBySource.values().next().value;

      assertHardhatInvariant(
        artifacts !== undefined && artifacts.length > 0,
        "An artifact must be present for the build info",
      );

      const anyArtifact = artifacts[0];

      const fqn = getFullyQualifiedName(
        anyArtifact.userSourceName,
        anyArtifact.edrArtifact.id.name,
      );

      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn,
        },
      );
    }

    if (!buildInfoContainsInlineConfig(buildInfoAndOutput.buildInfo)) {
      continue;
    }

    const buildInfoOutput: SolidityBuildInfoOutput = JSON.parse(
      bytesToUtf8String(buildInfoAndOutput.output),
    );

    for (const [
      inputSourceName,
      sourceArtifacts,
    ] of artifactsBySource.entries()) {
      const contractNames = new Set(
        sourceArtifacts.map((a) => a.edrArtifact.id.name),
      );

      const source = buildInfoOutput.output.sources[inputSourceName];
      const extracted = extractInlineConfigFromAst(
        source.ast,
        inputSourceName,
        contractNames,
      );
      overrides.push(...extracted);

      for (const artifact of sourceArtifacts) {
        const contractName = artifact.edrArtifact.id.name;
        const fqn = getFullyQualifiedName(inputSourceName, contractName);

        const methodIdentifiers =
          buildInfoOutput.output.contracts?.[inputSourceName][contractName]?.evm
            ?.methodIdentifiers;

        methodIdentifiersByContract.set(fqn, methodIdentifiers ?? {});
      }
    }
  }

  return { overrides, artifactIdsByFqn, methodIdentifiersByContract };
}

function buildTestFunctionOverrides(
  collected: CollectedOverrides,
): TestFunctionOverride[] {
  const { overrides, artifactIdsByFqn, methodIdentifiersByContract } =
    collected;

  // Group overrides by function. When the AST provides a functionSelector
  // (public/external functions in solc >= 0.6.0), use it to distinguish
  // overloaded functions. Otherwise fall back to function name only.
  const overridesByFunction = new Map<string, RawInlineOverride[]>();
  for (const override of overrides) {
    const functionFqn = getFunctionFqn(
      override.inputSourceName,
      override.contractName,
      override.functionName,
    );
    const groupKey =
      override.functionSelector !== undefined
        ? `${functionFqn}#${override.functionSelector}`
        : functionFqn;
    const existing = overridesByFunction.get(groupKey);
    if (existing === undefined) {
      overridesByFunction.set(groupKey, [override]);
    } else {
      existing.push(override);
    }
  }

  // Build TestFunctionOverride objects
  const testFunctionOverrides: TestFunctionOverride[] = [];
  for (const [_groupKey, groupOverrides] of overridesByFunction.entries()) {
    const firstOverride = groupOverrides[0];
    const functionFqn = getFunctionFqn(
      firstOverride.inputSourceName,
      firstOverride.contractName,
      firstOverride.functionName,
    );
    const contractFqn = `${firstOverride.inputSourceName}:${firstOverride.contractName}`;

    const artifactId = artifactIdsByFqn.get(contractFqn);
    assertHardhatInvariant(
      artifactId !== undefined,
      `Missing artifact id for "${contractFqn}"`,
    );

    // Use the AST-provided selector when available, otherwise fall back to
    // resolving via methodIdentifiers.
    let selector: string | undefined;
    if (firstOverride.functionSelector !== undefined) {
      selector = `0x${firstOverride.functionSelector}`;
    } else {
      const methodIdentifiers = methodIdentifiersByContract.get(contractFqn);
      assertHardhatInvariant(
        methodIdentifiers !== undefined,
        `Missing method identifiers for "${contractFqn}"`,
      );

      selector = resolveFunctionSelector(
        methodIdentifiers,
        firstOverride.functionName,
      );
    }

    if (selector === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_UNRESOLVED_SELECTOR,
        { functionFqn },
      );
    }

    testFunctionOverrides.push({
      identifier: {
        contractArtifact: artifactId,
        functionSelector: selector,
      },
      config: buildConfigOverride(groupOverrides),
    });
  }

  return testFunctionOverrides;
}
