import type { CollectedStruct } from "./ast-walker.js";
import type {
  SolidityBuildInfo,
  SolidityBuildInfoOutput,
} from "../../../../types/solidity/solidity-artifacts.js";
import type { BuildInfoAndOutput } from "../edr-artifacts.js";

import { bytesToUtf8String } from "@nomicfoundation/hardhat-utils/bytes";

import { extractStructsFromAst } from "./ast-walker.js";
import { canonicalizeStructs } from "./canonicalize.js";
import { isPathSelected } from "./glob.js";

export interface Eip712TypesConfig {
  include?: string[];
  exclude?: string[];
}

/**
 * Walks every compiled source's AST whose user source name matches the
 * configured `include` globs (and isn't matched by `exclude`), extracts
 * every struct definition, and returns the flat list of canonical EIP-712
 * type strings expected by EDR's `eip712CanonicalTypes` config field.
 *
 * When `include` is empty/unset the feature is off: collection short-circuits
 * and returns an empty list without parsing any build info.
 */
export function collectEip712CanonicalTypes(
  buildInfosAndOutputs: BuildInfoAndOutput[],
  config: Eip712TypesConfig | undefined,
): string[] {
  const include = config?.include ?? [];
  const exclude = config?.exclude ?? [];

  if (include.length === 0) {
    return [];
  }

  const parsed = buildInfosAndOutputs.map(({ buildInfo, output }) => {
    const parsedBuildInfo: SolidityBuildInfo = JSON.parse(
      bytesToUtf8String(buildInfo),
    );
    const parsedOutput: SolidityBuildInfoOutput = JSON.parse(
      bytesToUtf8String(output),
    );

    return { buildInfo: parsedBuildInfo, output: parsedOutput };
  });

  const inputToUserSource = new Map<string, string>();
  for (const { buildInfo } of parsed) {
    for (const [userSource, inputSource] of Object.entries(
      buildInfo.userSourceNameMap,
    )) {
      inputToUserSource.set(inputSource, userSource);
    }
  }

  // The same source can be compiled into more than one build info, so
  // dedupe structs by (sourceName, structName) before collecting them.
  const seen = new Set<string>();
  const collected: CollectedStruct[] = [];

  for (const { output } of parsed) {
    const sources = output.output.sources;
    if (sources === undefined) {
      continue;
    }

    for (const [inputSourceName, source] of Object.entries(sources)) {
      const userSourceName =
        inputToUserSource.get(inputSourceName) ?? inputSourceName;

      if (!isPathSelected(userSourceName, include, exclude)) {
        continue;
      }

      const structs = extractStructsFromAst(source.ast, userSourceName);
      for (const struct of structs) {
        const key = `${userSourceName}::${struct.name}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        collected.push(struct);
      }
    }
  }

  return canonicalizeStructs(collected);
}
