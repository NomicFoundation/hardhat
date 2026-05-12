import type { CollectedStruct } from "./ast-walker.js";
import type {
  SolidityBuildInfo,
  SolidityBuildInfoOutput,
} from "../../../../types/solidity/solidity-artifacts.js";
import type { BuildInfoAndOutput } from "../edr-artifacts.js";

import { bytesToUtf8String } from "@nomicfoundation/hardhat-utils/bytes";

import { HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT } from "../../../../types/solidity/solidity-artifacts.js";

import { buildUdvtIndex, extractStructsFromAst } from "./ast-walker.js";
import { canonicalizeStructs } from "./canonicalize.js";
import { isPathSelected } from "./glob.js";

export interface Eip712TypesConfig {
  include?: string[];
  exclude?: string[];
}

// When a transitive project file isn't a root in any build info — and so
// is missing from every userSourceNameMap — stripping this prefix recovers
// the user-facing path that the user's include/exclude globs are written
// against.
const PROJECT_INPUT_SOURCE_NAME_PREFIX = `${HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT}/`;

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

  const collected: CollectedStruct[] = [];

  for (const { output } of parsed) {
    const sources = output.output.sources;
    if (sources === undefined) {
      continue;
    }

    // Build the UDVT index *per build info*. solc node ids are unique only
    // within a single compilation, so pooling the indexes across build infos
    // would let one compilation's UDVT shadow another at the same numeric
    // id and silently resolve `referencedDeclaration` to the wrong
    // underlying type. The index still has to span every source in *this*
    // build (not just include-matched ones) because a struct in an included
    // file may reference a UDVT defined in a non-included file.
    const udvtIndex = buildUdvtIndex(
      Object.values(sources).map((s) => s.ast),
    );

    for (const [inputSourceName, source] of Object.entries(sources)) {
      let userSourceName = inputToUserSource.get(inputSourceName);

      if (userSourceName === undefined) {
        userSourceName = inputSourceName.startsWith(
          PROJECT_INPUT_SOURCE_NAME_PREFIX,
        )
          ? inputSourceName.slice(PROJECT_INPUT_SOURCE_NAME_PREFIX.length)
          : inputSourceName;
      }

      if (!isPathSelected(userSourceName, include, exclude)) {
        continue;
      }

      collected.push(
        ...extractStructsFromAst(source.ast, userSourceName, udvtIndex),
      );
    }
  }

  return canonicalizeStructs(collected);
}
