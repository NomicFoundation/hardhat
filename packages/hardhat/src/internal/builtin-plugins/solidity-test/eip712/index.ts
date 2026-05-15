import type { CollectedStruct } from "./ast-walker.js";
import type { SolidityBuildInfoOutput } from "../../../../types/solidity/solidity-artifacts.js";
import type { BuildInfoAndOutput } from "../edr-artifacts.js";

import {
  bytesIncludesUtf8String,
  bytesToUtf8String,
} from "@nomicfoundation/hardhat-utils/bytes";

import { HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT } from "../../solidity/constants.js";

import {
  buildUserDefinedValueTypeIndex,
  extractStructsFromAst,
} from "./ast-walker.js";
import { canonicalizeStructs } from "./canonicalize.js";
import { isPathSelected } from "./glob.js";

export interface Eip712TypesConfig {
  include: string[];
  exclude: string[];
}

// When a transitive project file doesn't produce an artifact — and so is
// missing from `inputToUserSource` — stripping this prefix recovers the
// user-facing path that the user's include/exclude globs are written against.
const PROJECT_INPUT_SOURCE_NAME_PREFIX = `${HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT}/`;

/**
 * Walks every compiled source's AST, extracts every struct definition, and
 * returns the flat list of canonical EIP-712 type strings expected by EDR's
 * `eip712CanonicalTypes` config field. Only structs from sources matching
 * `include`/`exclude` are emitted; non-selected sources still feed the dep
 * graph so cross-file deps inline correctly.
 *
 * `inputToUserSource` maps solc input source names to user source names; it's
 * built by the caller from the artifact set so we don't pay to parse every
 * build info just to recover that mapping.
 *
 * When `include` is empty/unset the feature is off: collection short-circuits
 * and returns an empty list without parsing any build info.
 */
export function collectEip712CanonicalTypes(
  buildInfosAndOutputs: BuildInfoAndOutput[],
  inputToUserSource: ReadonlyMap<string, string>,
  config: Eip712TypesConfig,
): string[] {
  const { include, exclude } = config;

  if (include.length === 0) {
    return [];
  }

  const collected: CollectedStruct[] = [];
  const selectedNames = new Set<string>();

  for (const { buildInfo, output } of buildInfosAndOutputs) {
    // Byte-level fast path: a build info whose source bytes don't contain
    // `struct ` can't define any EIP-712 type, so skip JSON-parsing its output.
    if (!bytesIncludesUtf8String(buildInfo, "struct ")) {
      continue;
    }

    const parsedOutput: SolidityBuildInfoOutput = JSON.parse(
      bytesToUtf8String(output),
    );

    const sources = parsedOutput.output.sources;
    if (sources === undefined) {
      continue;
    }

    // Two constraints determine the index's scope:
    //
    // 1. Per build info, not pooled across them. solc assigns node ids
    //    fresh in each compilation, so the same numeric id can mean
    //    different user-defined value types in different builds. Pooling
    //    would let one compilation's definition silently overwrite
    //    another's at the same key, mis-resolving `referencedDeclaration`.
    //    See the test "scopes user-defined value type resolution per build
    //    info when node ids collide" for a repro.
    //
    // 2. Whole build info, not narrowed to a subset of sources. A struct
    //    member's `referencedDeclaration` can point at a user-defined
    //    value type defined in any source within the same compilation, so
    //    the index must cover every source in the build.
    const userDefinedValueTypeI = buildUserDefinedValueTypeIndex(
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

      // Collect every source so non-selected files can serve as dep targets;
      // selection is enforced at emit time via `selectedNames`.
      const structs = extractStructsFromAst(
        source.ast,
        userSourceName,
        userDefinedValueTypeI,
      );
      collected.push(...structs);

      if (isPathSelected(userSourceName, include, exclude)) {
        for (const s of structs) {
          selectedNames.add(s.name);
        }
      }
    }
  }

  return canonicalizeStructs(collected, selectedNames);
}
