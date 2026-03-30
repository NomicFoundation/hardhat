import type { RawInlineOverride } from "./types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  kebabToCamelCase,
  snakeToCamelCase,
} from "@nomicfoundation/hardhat-utils/string";

import {
  HARDHAT_CONFIG_PREFIX,
  FORGE_CONFIG_PREFIX,
  TOP_LEVEL_KEYS,
} from "./constants.js";
import { getFunctionFqn } from "./helpers.js";

/**
 * Extracts raw inline config overrides from a solc AST for a single source
 * file.
 */
export function extractInlineConfigFromAst(
  ast: unknown,
  inputSourceName: string,
  contractNames: Set<string>,
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

    if (!contractNames.has(contractName)) {
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

      const fnSelector =
        typeof member.functionSelector === "string"
          ? member.functionSelector
          : undefined;

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
          parsed.functionSelector = fnSelector;
          results.push(parsed);
        }
      }
    }
  }

  return results;
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

  if (trimmedLine.startsWith(HARDHAT_CONFIG_PREFIX)) {
    keyValueSegment = trimmedLine.slice(HARDHAT_CONFIG_PREFIX.length).trim();
  } else if (trimmedLine.startsWith(FORGE_CONFIG_PREFIX)) {
    keyValueSegment = trimmedLine.slice(FORGE_CONFIG_PREFIX.length).trim();
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

  // Detect profile prefix: if the first dot-segment is NOT a known top-level
  // category, treat it as a profile name.
  const firstDot = rawKey.indexOf(".");
  if (firstDot !== -1) {
    const firstSegment = rawKey.slice(0, firstDot);
    if (!TOP_LEVEL_KEYS.includes(firstSegment)) {
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

  parsedKey = snakeToCamelCase(kebabToCamelCase(parsedKey));

  return {
    inputSourceName,
    contractName,
    functionName,
    key: parsedKey,
    rawKey,
    rawValue,
  };
}
