import type { SolidityBuildInfoOutput } from "../../../../types/solidity/solidity-artifacts.js";
import type {
  BuildInfoAndOutput,
  EdrArtifactWithMetadata,
} from "../edr-artifacts.js";
import type { RawInlineOverride as RawInlineOverrideType } from "./types.js";
import type {
  ArtifactId,
  TestFunctionOverride,
} from "@nomicfoundation/edr";

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
  overrides: RawInlineOverrideType[];
  artifactIdsByFqn: Map<string, ArtifactId>;
  methodIdentifiersByContract: Map<string, Record<string, string>>;
}

/**
 * Extracts per-test inline configuration overrides from the NatSpec comments
 * in the solc AST.
 *
 * The same source file can appear in multiple build infos (as a transitive
 * dependency). A deduplication set prevents processing the same source twice.
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
  const overrides: RawInlineOverrideType[] = [];
  const methodIdentifiersByContract = new Map<string, Record<string, string>>();
  const processedSources = new Set<string>();

  // Build lookup structures so we can skip irrelevant build infos
  const testSuiteBuildInfoIds = new Set<string>();
  const testSuiteSources = new Set<string>();
  const artifactIdsByFqn = new Map<string, ArtifactId>();
  for (const { edrArtifact, buildInfoId } of testSuiteArtifacts) {
    testSuiteBuildInfoIds.add(buildInfoId);
    testSuiteSources.add(edrArtifact.id.source);
    const fqn = getFullyQualifiedName(
      edrArtifact.id.source,
      edrArtifact.id.name,
    );
    artifactIdsByFqn.set(fqn, edrArtifact.id);
  }
  const filteredBuildInfosAndOutputs = buildInfosAndOutputs.filter((bio) =>
    testSuiteBuildInfoIds.has(bio.buildInfoId),
  );

  // Extract raw overrides and collect metadata for each source file.
  // Only build infos referenced by testSuiteArtifacts are processed, and we
  // only parse the output to get ASTs and method identifiers.
  for (const buildInfoAndOutput of filteredBuildInfosAndOutputs) {
    if (!buildInfoContainsInlineConfig(buildInfoAndOutput.buildInfo)) {
      continue;
    }

    const buildInfoOutput: SolidityBuildInfoOutput = JSON.parse(
      bytesToUtf8String(buildInfoAndOutput.output),
    );

    for (const inputSourceName of Object.keys(buildInfoOutput.output.sources)) {
      if (!testSuiteSources.has(inputSourceName)) {
        continue;
      }
      if (processedSources.has(inputSourceName)) {
        continue;
      }
      processedSources.add(inputSourceName);

      const source = buildInfoOutput.output.sources[inputSourceName];
      const extracted = extractInlineConfigFromAst(source.ast, inputSourceName);
      overrides.push(...extracted);

      for (const [contractName, contractOutput] of Object.entries(
        buildInfoOutput.output.contracts?.[inputSourceName] ?? {},
      )) {
        const fqn = getFullyQualifiedName(inputSourceName, contractName);
        methodIdentifiersByContract.set(
          fqn,
          contractOutput.evm?.methodIdentifiers ?? {},
        );
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
  const overridesByFunction = new Map<
    string,
    RawInlineOverrideType[]
  >();
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
      const methodIdentifiers =
        methodIdentifiersByContract.get(contractFqn);
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
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_UNRESOLVED_SELECTOR,
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
