import type { CollectedStruct } from "./ast-walker.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

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
 * Only names in `selectedNames` are emitted; non-selected structs still
 * participate in dep resolution so cross-file deps inline correctly.
 */
export function canonicalizeStructs(
  structs: CollectedStruct[],
  selectedNames: Set<string>,
): string[] {
  const byName = indexByName(structs, selectedNames);
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
 * Conflicts on a name reachable from any selected struct (selected roots plus
 * their transitive deps) throw, since the selected struct's inlined dep head
 * would otherwise depend on which conflicting copy happened to be seen first.
 * Conflicts on names truly unreachable from the selected set are silently
 * deduped (first wins). Selected structs are processed first so they win over
 * non-selected copies.
 */
function indexByName(
  structs: CollectedStruct[],
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
    ...structs.filter((s) => selectedNames.has(s.name)),
    ...structs.filter((s) => !selectedNames.has(s.name)),
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

    if (!selectedNames.has(struct.name)) {
      if (!deferredConflicts.has(struct.name)) {
        deferredConflicts.set(struct.name, {
          firstSource: sourceByName.get(struct.name) ?? "<unknown>",
          secondSource: struct.sourcePath,
        });
      }
      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
      {
        name: struct.name,
        firstSource: sourceByName.get(struct.name) ?? "<unknown>",
        secondSource: struct.sourcePath,
      },
    );
  }

  if (deferredConflicts.size > 0) {
    const reachable = reachableFromSelected(byName, selectedNames);
    for (const [name, sources] of deferredConflicts) {
      if (reachable.has(name)) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.SOLIDITY_TESTS.EIP712_DUPLICATE_STRUCT_NAME,
          { name, ...sources },
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
