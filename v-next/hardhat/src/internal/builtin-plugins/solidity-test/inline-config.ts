import type {
  SolidityBuildInfo,
  SolidityBuildInfoOutput,
} from "../../../types/solidity/solidity-artifacts.js";
import type {
  ArtifactId,
  BuildInfoAndOutput,
  TestFunctionConfigOverride,
  TestFunctionOverride,
} from "@nomicfoundation/edr";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import {
  bytesToUtf8String,
  bytesIncludesUtf8String,
} from "@nomicfoundation/hardhat-utils/bytes";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { kebabToCamelCase } from "@nomicfoundation/hardhat-utils/string";

import { getFullyQualifiedName } from "../../../utils/contract-names.js";

const HARDHAT_CONFIG_PREFIX = "hardhat-config:";
const FORGE_CONFIG_PREFIX = "forge-config:";

/** All supported inline config keys and their expected value types. */
const KEY_TYPES: Record<string, "number" | "boolean"> = {
  "fuzz.runs": "number",
  "fuzz.maxTestRejects": "number",
  "fuzz.showLogs": "boolean",
  "fuzz.timeout": "number",
  "invariant.runs": "number",
  "invariant.depth": "number",
  "invariant.failOnRevert": "boolean",
  "invariant.callOverride": "boolean",
  "invariant.timeout": "number",
  allowInternalExpectRevert: "boolean",
};

export interface RawInlineOverride {
  inputSourceName: string;
  contractName: string;
  functionName: string;
  key: string; // parsed camelCase key, without profile prefix
  rawKey: string; // original key as written by the user, for error messages
  rawValue: string;
}

interface SourceMetadata {
  solcVersion: string;
  contracts: Record<string, Record<string, string>>; // contractName -> methodIdentifiers
}

/**
 * Extracts per-test inline configuration overrides from the NatSpec comments
 * in the solc AST.
 *
 * The same source file can appear in multiple build infos (as a transitive
 * dependency). A deduplication set prevents processing the same source twice.
 */
export function getTestFunctionOverrides(
  buildInfos: BuildInfoAndOutput[],
): TestFunctionOverride[] {
  const allRawOverrides: RawInlineOverride[] = [];
  const sourceMetadata = new Map<string, SourceMetadata>(); // inputSourceName -> metadata
  const processedSources = new Set<string>();

  // Extract raw overrides and collect metadata for each source file.
  // We parse buildInfo first (smaller) to check source names, and only parse
  // the larger output if there are unprocessed sources.
  for (const entry of buildInfos) {
    if (!buildInfoContainsInlineConfig(entry.buildInfo)) {
      continue;
    }

    const buildInfo: SolidityBuildInfo = JSON.parse(
      bytesToUtf8String(entry.buildInfo),
    );

    const inputSourceNames = Object.keys(buildInfo.input.sources);
    const newSourceNames = inputSourceNames.filter(
      (name) => !processedSources.has(name),
    );

    if (newSourceNames.length === 0) {
      continue;
    }

    const buildInfoOutput: SolidityBuildInfoOutput = JSON.parse(
      bytesToUtf8String(entry.output),
    );

    const solcVersion = buildInfo.solcVersion;

    for (const inputSourceName of newSourceNames) {
      processedSources.add(inputSourceName);

      const source = buildInfoOutput.output.sources[inputSourceName];
      const overrides = extractInlineConfigFromAst(source.ast, inputSourceName);
      allRawOverrides.push(...overrides);

      const contracts: Record<string, Record<string, string>> = {};
      for (const [contractName, contractOutput] of Object.entries(
        buildInfoOutput.output.contracts?.[inputSourceName] ?? {},
      )) {
        contracts[contractName] = contractOutput.evm?.methodIdentifiers ?? {};
      }
      sourceMetadata.set(inputSourceName, { solcVersion, contracts });
    }
  }

  validateInlineOverrides(allRawOverrides);

  // Group overrides by (inputSourceName, contractName, functionName)
  const grouped = new Map<string, RawInlineOverride[]>();
  for (const override of allRawOverrides) {
    const groupKey = `${override.inputSourceName}|${override.contractName}|${override.functionName}`;
    const existing = grouped.get(groupKey);
    if (existing === undefined) {
      grouped.set(groupKey, [override]);
    } else {
      existing.push(override);
    }
  }

  // Build TestFunctionOverride objects
  const testFunctionOverrides: TestFunctionOverride[] = [];
  for (const [groupKey, overrides] of grouped.entries()) {
    const [inputSourceName, contractName, functionName] = groupKey.split("|");
    const meta = sourceMetadata.get(inputSourceName);
    assertHardhatInvariant(
      meta !== undefined,
      `Missing source metadata for "${inputSourceName}"`,
    );

    const methodIdentifiers = meta.contracts[contractName];
    assertHardhatInvariant(
      methodIdentifiers !== undefined,
      `Missing method identifiers for contract "${contractName}" in "${inputSourceName}"`,
    );

    const selector = resolveFunctionSelector(methodIdentifiers, functionName);
    if (selector === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_UNRESOLVED_SELECTOR,
        {
          functionFqn: getFunctionFqn(
            inputSourceName,
            contractName,
            functionName,
          ),
        },
      );
    }

    const artifactId: ArtifactId = {
      name: contractName,
      source: inputSourceName,
      solcVersion: meta.solcVersion,
    };

    testFunctionOverrides.push({
      identifier: {
        contractArtifact: artifactId,
        functionSelector: selector,
      },
      config: buildConfigOverride(overrides),
    });
  }

  return testFunctionOverrides;
}

/**
 * Returns true if the build info bytes contain either of the inline config
 * prefixes.
 */
export function buildInfoContainsInlineConfig(
  buildInfoBytes: Uint8Array,
): boolean {
  return (
    bytesIncludesUtf8String(buildInfoBytes, HARDHAT_CONFIG_PREFIX) ||
    bytesIncludesUtf8String(buildInfoBytes, FORGE_CONFIG_PREFIX)
  );
}

/**
 * Extracts raw inline config overrides from a solc AST for a single source
 * file.
 */
export function extractInlineConfigFromAst(
  ast: unknown,
  inputSourceName: string,
): RawInlineOverride[] {
  if (!isObject(ast) || ast.nodeType !== "SourceUnit") {
    return [];
  }

  const results: RawInlineOverride[] = [];
  const nodes: unknown[] = Array.isArray(ast.nodes) ? ast.nodes : [];
  for (const node of nodes) {
    if (!isObject(node) || node.nodeType !== "ContractDefinition") {
      continue;
    }

    const contractName = node.name;
    if (typeof contractName !== "string") {
      continue;
    }

    const members: unknown[] = Array.isArray(node.nodes) ? node.nodes : [];
    for (const member of members) {
      if (!isObject(member) || member.nodeType !== "FunctionDefinition") {
        continue;
      }

      const fnName = member.name;
      if (
        typeof fnName !== "string" ||
        (!fnName.startsWith("test") && !fnName.startsWith("invariant"))
      ) {
        continue;
      }

      const docText = extractDocText(member.documentation);
      if (docText === undefined) {
        continue;
      }

      for (const line of docText.split("\n")) {
        const parsed = parseInlineConfigLine(
          line,
          inputSourceName,
          contractName,
          fnName,
        );
        if (parsed !== undefined) {
          results.push(parsed);
        }
      }
    }
  }

  return results;
}

/**
 * Validates a list of raw inline overrides, checking for:
 * - Valid keys
 * - No duplicate keys for the same function
 * - Values of the expected type (numbers must be positive integers, booleans
 *   must be "true" or "false")
 *
 * Throws a HardhatError if any validation fails.
 */
export function validateInlineOverrides(overrides: RawInlineOverride[]): void {
  const seen = new Set<string>();

  for (const {
    inputSourceName,
    contractName,
    functionName,
    rawKey,
    rawValue,
    key,
  } of overrides) {
    const functionFqn = getFunctionFqn(
      inputSourceName,
      contractName,
      functionName,
    );

    // Validate key
    if (!Object.hasOwn(KEY_TYPES, key)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_KEY,
        {
          key: rawKey,
          validKeys: Object.keys(KEY_TYPES).join(", "),
          functionFqn,
        },
      );
    }

    // Check for duplicates
    const dedupeKey = `${functionFqn}-${key}`;
    if (seen.has(dedupeKey)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_DUPLICATE_KEY,
        { key: rawKey, functionFqn },
      );
    }
    seen.add(dedupeKey);

    // Validate value type
    const expectedType = KEY_TYPES[key];
    if (expectedType === "number") {
      const n = Number(rawValue);
      if (!Number.isInteger(n) || n <= 0) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
          {
            value: rawValue,
            key: rawKey,
            expectedType: "positive integer",
            functionFqn,
          },
        );
      }
    } else {
      if (rawValue !== "true" && rawValue !== "false") {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
          {
            value: rawValue,
            key: rawKey,
            expectedType: "boolean",
            functionFqn,
          },
        );
      }
    }
  }
}

/**
 * Finds the function selector for a given function name in the methodIdentifiers
 * map. Matches the first entry whose signature starts with `functionName(`.
 * Returns the selector prefixed with "0x".
 */
export function resolveFunctionSelector(
  methodIdentifiers: Record<string, string>,
  functionName: string,
): string | undefined {
  const prefix = `${functionName}(`;

  for (const [signature, selector] of Object.entries(methodIdentifiers)) {
    if (signature.startsWith(prefix)) {
      return `0x${selector}`;
    }
  }

  return undefined;
}

/**
 * Converts a validated set of raw overrides into a TestFunctionConfigOverride
 * object.
 */
export function buildConfigOverride(
  overrides: RawInlineOverride[],
): TestFunctionConfigOverride {
  const config: Record<string, unknown> = {};
  const fuzz: Record<string, unknown> = {};
  const invariant: Record<string, unknown> = {};

  for (const override of overrides) {
    const expectedType = KEY_TYPES[override.key];
    const parsed =
      expectedType === "number"
        ? Number(override.rawValue)
        : override.rawValue === "true";

    const dotIndex = override.key.indexOf(".");
    if (dotIndex === -1) {
      // Top-level key, like "allowInternalExpectRevert"
      config[override.key] = parsed;
    } else {
      const section = override.key.slice(0, dotIndex);
      const field = override.key.slice(dotIndex + 1);
      const target = section === "fuzz" ? fuzz : invariant;
      target[field] = field === "timeout" ? { time: parsed } : parsed;
    }
  }

  if (Object.keys(fuzz).length > 0) {
    config.fuzz = fuzz;
  }
  if (Object.keys(invariant).length > 0) {
    config.invariant = invariant;
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  Cast is safe because we have validated all keys and value types in the previous step. */
  return config as TestFunctionConfigOverride;
}

/**
 * Extracts the documentation text from a FunctionDefinition's documentation
 * field, which can be a StructuredDocumentation node, a plain string, or null.
 */
export function extractDocText(doc: unknown): string | undefined {
  if (
    isObject(doc) &&
    doc.nodeType === "StructuredDocumentation" &&
    typeof doc.text === "string"
  ) {
    return doc.text;
  } else if (typeof doc === "string") {
    return doc;
  } else {
    return undefined;
  }
}

/**
 * Parses a single line from a NatSpec comment and returns a RawInlineOverride
 * if the line contains a valid inline config directive. The line must start
 * with either "hardhat-config:" or "forge-config:", followed by a key=value pair.
 * Returns undefined if the line does not contain an inline config directive.
 */
export function parseInlineConfigLine(
  line: string,
  inputSourceName: string,
  contractName: string,
  functionName: string,
): RawInlineOverride | undefined {
  // Strip leading whitespace and optional leading '*' from NatSpec text.
  // Solc's StructuredDocumentation.text has delimiters (///, /**, */) removed.
  // For /// comments, text has leading whitespace; for /** */ blocks, interior
  // lines may start with " * ". The regex handles both styles.
  const trimmedLine = line.replace(/^\s*\*?\s*/, "");
  const functionFqn = getFunctionFqn(
    inputSourceName,
    contractName,
    functionName,
  );

  let keyValueSegment: string;
  let isForgeConfig: boolean;

  if (trimmedLine.startsWith(HARDHAT_CONFIG_PREFIX)) {
    keyValueSegment = trimmedLine.slice(HARDHAT_CONFIG_PREFIX.length).trim();
    isForgeConfig = false;
  } else if (trimmedLine.startsWith(FORGE_CONFIG_PREFIX)) {
    keyValueSegment = trimmedLine.slice(FORGE_CONFIG_PREFIX.length).trim();
    isForgeConfig = true;
  } else {
    return undefined;
  }

  const eqIndex = keyValueSegment.indexOf("=");
  if (eqIndex === -1) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_SYNTAX,
      {
        line: trimmedLine,
        functionFqn,
      },
    );
  }

  const rawKey = keyValueSegment.slice(0, eqIndex).trim();
  let parsedKey = rawKey;
  const rawValue = keyValueSegment.slice(eqIndex + 1).trim();

  if (isForgeConfig) {
    // Detect profile prefix: if the first dot-segment is NOT a known top-level
    // category, treat it as a profile name.
    const firstDot = rawKey.indexOf(".");
    if (firstDot !== -1) {
      const firstSegment = rawKey.slice(0, firstDot);
      const topLevelKeys = Object.keys(KEY_TYPES).map((k) => k.split(".")[0]);
      if (!topLevelKeys.includes(firstSegment)) {
        // It's a profile. Validate it.
        const profile = firstSegment;
        if (profile !== "default") {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_UNSUPPORTED_PROFILE,
            {
              profile,
              functionFqn,
            },
          );
        }
        // Strip the "default." prefix
        parsedKey = rawKey.slice(firstDot + 1);
      }
    }
  }

  parsedKey = kebabToCamelCase(parsedKey);

  return {
    inputSourceName,
    contractName,
    functionName,
    key: parsedKey,
    rawKey,
    rawValue,
  };
}

/**
 * Constructs a fully qualified function name, in the format
 * "source.sol:ContractName#functionName".
 */
export function getFunctionFqn(
  inputSourceName: string,
  contractName: string,
  functionName: string,
): string {
  return `${getFullyQualifiedName(inputSourceName, contractName)}#${functionName}`;
}
