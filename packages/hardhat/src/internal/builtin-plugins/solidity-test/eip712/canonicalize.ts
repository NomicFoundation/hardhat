import type { CollectedStruct } from "./ast-walker.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

export const SELECTED_CONFLICT_REMEDIATION =
  "Rename one of the structs, or scope your `test.solidity.eip712Types.include` / `exclude` globs in `hardhat.config.ts` so that only one of them is selected.";

export const DEPENDENCY_CONFLICT_REMEDIATION =
  "Rename one of the structs. Narrowing `test.solidity.eip712Types.include` / `exclude` won't resolve this: the conflicting definition is pulled in as a dependency of a selected struct, not selected directly.";

/**
 * Produces the flat list of canonical EIP-712 type strings expected by EDR.
 *
 * Each encodable struct contributes one entry, built like this:
 *   1. Start with the struct's own head: `Name(type1 name1,type2 name2,...)`.
 *   2. If the struct has fields that reference other structs, append those
 *      structs' heads after it, sorted alphabetically.
 *
 * Examples:
 *   - `Person` has only primitive fields (address, string), so its entry is
 *     just its own head:
 *       `Person(address wallet,string name)`
 *   - `Mail` has a `Person` field, so its entry is its head plus `Person`'s
 *     head appended:
 *       `Mail(Person from,Person to,string contents)Person(address wallet,string name)`
 *
 * Structs that contain members whose type cannot be EIP-712 encoded (mappings,
 * function types, etc.) are dropped entirely, along with any structs that
 * depend on them transitively. This matches `forge bind-json`'s behavior:
 * `resolve_struct_eip712` returns `None` for any struct containing unsupported
 * constructs and propagates `None` through the dep graph so dependents are
 * also dropped.
 *
 * Selection is scoped by source, not by struct name: `selectedSources` holds
 * the project-relative paths matched by the user's include/exclude globs. Only
 * structs from those sources are emitted, but structs elsewhere still feed dep
 * resolution so cross-file deps inline correctly. Scoping by source is what
 * lets a non-selected file define a same-named struct without it being mistaken
 * for selected.
 */
export function canonicalizeStructs(
  structs: CollectedStruct[],
  selectedSources: Set<string>,
): string[] {
  // A name is "selected" if any of its definitions lives in a selected source.
  // Drives what's emitted and, in `indexByName`, whether a selected definition
  // exists to win a name collision.
  const selectedNames = new Set<string>();
  for (const struct of structs) {
    if (selectedSources.has(struct.sourcePath)) {
      selectedNames.add(struct.name);
    }
  }

  const byName = indexByName(structs, selectedSources, selectedNames);
  const knownNames = new Set(byName.keys());
  const encodable = computeEncodable(byName, knownNames);
  const result: string[] = [];

  for (const struct of byName.values()) {
    if (!selectedNames.has(struct.name)) {
      continue;
    }

    if (!encodable.has(struct.name)) {
      continue;
    }

    const head = encodeStructHead(struct);
    const deps = transitiveDeps(struct, byName)
      .map((depName) => {
        const def = byName.get(depName);
        return def === undefined ? undefined : encodeStructHead(def);
      })
      .filter((s): s is string => s !== undefined);

    deps.sort();

    result.push(head + deps.join(""));
  }

  return result;
}

/**
 * Returns the set of struct names that are EIP-712 encodable. A struct is
 * encodable if none of its members has a non-decodable type (`type === undefined`,
 * e.g. mappings or function types) AND every one of its struct deps — direct or
 * transitive — is itself encodable.
 */
function computeEncodable(
  byName: Map<string, CollectedStruct>,
  knownNames: Set<string>,
): Set<string> {
  const encodable = new Set<string>(byName.keys());

  for (const [name, struct] of byName) {
    if (struct.members.some((m) => m.type === undefined)) {
      encodable.delete(name);
    }
  }

  const depsByName = new Map<string, string[]>();
  for (const [name, struct] of byName) {
    depsByName.set(name, directStructDeps(struct, knownNames));
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const name of [...encodable]) {
      const deps = depsByName.get(name) ?? [];
      if (deps.some((dep) => !encodable.has(dep))) {
        encodable.delete(name);
        changed = true;
      }
    }
  }

  return encodable;
}

/**
 * Computes the EIP-712 `encodeType` string for one struct in isolation:
 *   `Name(type1 name1,type2 name2,...)`.
 * Members whose type is `undefined` (e.g. mappings) are dropped.
 */
function encodeStructHead(struct: CollectedStruct): string {
  const memberSegments: string[] = [];
  for (const member of struct.members) {
    if (member.type === undefined) {
      continue;
    }

    memberSegments.push(`${member.type} ${member.name}`);
  }

  return `${struct.name}(${memberSegments.join(",")})`;
}

/**
 * Returns the names of all struct dependencies referenced by `struct`'s
 * members. Considers the base type of arrays. Members whose base type does not
 * resolve to a known struct (elementary types, address, etc.) are ignored.
 */
function directStructDeps(
  struct: CollectedStruct,
  knownStructNames: Set<string>,
): string[] {
  const deps = new Set<string>();
  for (const member of struct.members) {
    if (member.type === undefined) {
      continue;
    }

    // Strip array suffixes: `Foo[]`, `Foo[3]`, `Foo[3][2]` → `Foo`.
    const base = member.type.split("[")[0];

    if (knownStructNames.has(base) && base !== struct.name) {
      deps.add(base);
    }
  }

  return [...deps];
}

/**
 * Walks the dep graph from `root` and returns the set of all transitively
 * referenced struct names (excluding the root itself).
 */
function transitiveDeps(
  root: CollectedStruct,
  byName: Map<string, CollectedStruct>,
): string[] {
  const visited = new Set<string>();
  const knownNames = new Set(byName.keys());
  const stack = directStructDeps(root, knownNames);

  while (stack.length > 0) {
    const next = stack.pop();

    if (next === undefined || visited.has(next) || next === root.name) {
      continue;
    }

    visited.add(next);

    const def = byName.get(next);

    if (def !== undefined) {
      stack.push(...directStructDeps(def, knownNames));
    }
  }

  return [...visited];
}

/**
 * Builds a name → definition map from collected structs, throwing
 * `EIP712_DUPLICATE_STRUCT_NAME` when two structs share a name but have
 * different member lists. Definitions with identical members are silently
 * deduplicated (same struct seen across multiple build infos / partial
 * recompiles).
 *
 * The comparison uses the full member list — including members whose type
 * isn't EIP-712 encodable (mappings, function types) — so that two structs
 * differing only in unsupported members are detected as conflicting rather
 * than collapsed into one. Comparing only the encoded head would let a
 * non decodable definition silently win over an encodable one, dropping the
 * struct from the canonical output.
 *
 * A name clash aborts the run only when it could change the output; otherwise
 * the first definition wins silently. Selection is scoped by source
 * (`selectedSources`), not by name, so a non-selected source whose struct name
 * collides with a selected one stays non-selected. `selectedNames` is the
 * derived set of names with at least one selected definition. Selected structs
 * are processed first, so the already-stored definition in any collision is
 * selected when one exists. Two rules resolve conflicts:
 *
 *   - Both sides selected: throw immediately — genuinely ambiguous which to
 *     emit.
 *   - Current side non-selected: defer; the stored definition keeps the name.
 *     Throw only if the name is reachable from a selected struct (its
 *     transitive deps), since then which copy got inlined would depend on
 *     iteration order. Names unreachable from the selected set are silently
 *     deduped (first wins), so a non-selected struct that merely shares a
 *     name with a selected root or an unreferenced struct never aborts the
 *     run.
 */
function indexByName(
  structs: CollectedStruct[],
  selectedSources: Set<string>,
  selectedNames: Set<string>,
): Map<string, CollectedStruct> {
  const byName = new Map<string, CollectedStruct>();
  const fingerprintByName = new Map<string, string>();
  const sourceByName = new Map<string, string>();
  const deferredConflicts = new Map<
    string,
    { firstSource: string; secondSource: string }
  >();

  const ordered = [
    ...structs.filter((s) => selectedSources.has(s.sourcePath)),
    ...structs.filter((s) => !selectedSources.has(s.sourcePath)),
  ];

  for (const struct of ordered) {
    const fingerprint = fingerprintStruct(struct);
    const existingFingerprint = fingerprintByName.get(struct.name);

    if (existingFingerprint === undefined) {
      byName.set(struct.name, struct);
      fingerprintByName.set(struct.name, fingerprint);
      sourceByName.set(struct.name, struct.sourcePath);
      continue;
    }

    if (existingFingerprint === fingerprint) {
      continue;
    }

    if (selectedSources.has(struct.sourcePath)) {
      // Selected-vs-selected conflict: both this and the stored definition are
      // selected (selected structs come first), so it's ambiguous which to emit.
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
        {
          name: struct.name,
          firstSource: sourceByName.get(struct.name) ?? "<unknown>",
          secondSource: struct.sourcePath,
          remediation: SELECTED_CONFLICT_REMEDIATION,
        },
      );
    }

    // Non-selected side, so the stored definition (selected if the name has
    // one, since selected sources come first) keeps the name. Defer: throw
    // later only if the name is reachable from a selected struct. Sharing a
    // name with a selected root or an unreferenced struct is harmless and
    // must not abort.
    if (!deferredConflicts.has(struct.name)) {
      deferredConflicts.set(struct.name, {
        firstSource: sourceByName.get(struct.name) ?? "<unknown>",
        secondSource: struct.sourcePath,
      });
    }
  }

  if (deferredConflicts.size > 0) {
    const reachable = reachableFromSelected(byName, selectedNames);
    for (const [name, sources] of deferredConflicts) {
      if (reachable.has(name)) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
          { name, ...sources, remediation: DEPENDENCY_CONFLICT_REMEDIATION },
        );
      }
    }
  }

  return byName;
}

/**
 * Set of struct names transitively referenced by any struct in `selectedNames`.
 * The walk uses whatever first-wins definition is in `byName`; that's enough
 * for conflict detection since we only need to know whether a name is
 * reachable, not which conflicting copy is the "right" one.
 */
function reachableFromSelected(
  byName: Map<string, CollectedStruct>,
  selectedNames: Set<string>,
): Set<string> {
  const knownNames = new Set(byName.keys());
  const reachable = new Set<string>();
  const stack: string[] = [];

  for (const name of selectedNames) {
    const root = byName.get(name);
    if (root !== undefined) {
      stack.push(...directStructDeps(root, knownNames));
    }
  }

  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || reachable.has(next)) {
      continue;
    }

    reachable.add(next);

    const def = byName.get(next);
    if (def !== undefined) {
      stack.push(...directStructDeps(def, knownNames));
    }
  }

  return reachable;
}

/**
 * A stable string capturing every member of `struct`, used to detect
 * conflicting definitions of the same name. Unlike `encodeStructHead`, this
 * preserves members whose type can't be EIP-712 encoded — they're emitted with
 * an `<unsupported>` sentinel — so structs that differ only in mapping or
 * function-type members aren't collapsed together.
 */
function fingerprintStruct(struct: CollectedStruct): string {
  const segments = struct.members.map(
    (m) => `${m.type ?? "<unsupported>"} ${m.name}`,
  );

  return `${struct.name}(${segments.join(",")})`;
}
