import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * A single field of a Solidity struct
 */
export interface StructMember {
  name: string;
  /**
   * EIP-712 type string, or `undefined` if the type can't be encoded (e.g. mappings).
   */
  type: string | undefined;
}

/**
 * A Solidity struct extracted from a source AST (Abstract Syntax Tree).
 */
export interface CollectedStruct {
  name: string;
  members: StructMember[];
  /**
   * Project-relative source path. Used for diagnostics only.
   */
  sourcePath: string;
}

/**
 * A user-defined value type (`type Foo is bytes32;`) resolves to its
 * underlying elementary type for EIP-712 encoding.
 * The map is keyed by the user-defined value type definition's solc node id,
 * which is what `referencedDeclaration` on a `UserDefinedTypeName` reference
 * points to.
 */
export type UserDefinedValueTypeIndex = Map<number, Record<string, unknown>>;

/**
 * Walks every AST in the build and indexes every `UserDefinedValueTypeDefinition`
 * by its node `id`, mapping to its `underlyingType` (an `ElementaryTypeName`).
 *
 * User-defined value types can sit at file scope or inside a contract, and a
 * struct in one source may reference a user-defined value type defined in
 * another, so this must run across every AST in the build — not just the ones
 * matched by the user's include globs.
 */
export function buildUserDefinedValueTypeIndex(
  asts: unknown[],
): UserDefinedValueTypeIndex {
  const index: UserDefinedValueTypeIndex = new Map();

  for (const ast of asts) {
    if (!isObject(ast) || ast.nodeType !== "SourceUnit") {
      continue;
    }

    const topLevelNodes: unknown[] = Array.isArray(ast.nodes) ? ast.nodes : [];
    for (const node of topLevelNodes) {
      if (!isObject(node)) {
        continue;
      }

      if (node.nodeType === "UserDefinedValueTypeDefinition") {
        recordUserDefinedValueType(node, index);
      } else if (node.nodeType === "ContractDefinition") {
        const members: unknown[] = Array.isArray(node.nodes) ? node.nodes : [];
        for (const member of members) {
          if (
            isObject(member) &&
            member.nodeType === "UserDefinedValueTypeDefinition"
          ) {
            recordUserDefinedValueType(member, index);
          }
        }
      }
    }
  }

  return index;
}

function recordUserDefinedValueType(
  node: Record<string, unknown>,
  index: UserDefinedValueTypeIndex,
): void {
  if (
    typeof node.id === "number" &&
    isObject(node.underlyingType) &&
    node.underlyingType.nodeType === "ElementaryTypeName"
  ) {
    index.set(node.id, node.underlyingType);
  }
}

/**
 * Returns every struct definition reachable from a solc source AST (Abstract Syntax Tree),
 * including structs nested inside contracts.
 */
export function extractStructsFromAst(
  ast: unknown,
  sourcePath: string,
  userDefinedValueTypeI: UserDefinedValueTypeIndex = new Map(),
): CollectedStruct[] {
  if (!isObject(ast) || ast.nodeType !== "SourceUnit") {
    return [];
  }

  const results: CollectedStruct[] = [];
  const topLevelNodes: unknown[] = Array.isArray(ast.nodes) ? ast.nodes : [];

  for (const node of topLevelNodes) {
    if (!isObject(node)) {
      continue;
    }

    if (node.nodeType === "StructDefinition") {
      const collected = collectStruct(node, sourcePath, userDefinedValueTypeI);
      if (collected !== undefined) {
        results.push(collected);
      }
    } else if (node.nodeType === "ContractDefinition") {
      const members: unknown[] = Array.isArray(node.nodes) ? node.nodes : [];
      for (const member of members) {
        if (isObject(member) && member.nodeType === "StructDefinition") {
          const collected = collectStruct(
            member,
            sourcePath,
            userDefinedValueTypeI,
          );
          if (collected !== undefined) {
            results.push(collected);
          }
        }
      }
    }
  }

  return results;
}

function collectStruct(
  node: Record<string, unknown>,
  sourcePath: string,
  userDefinedValueTypeI: UserDefinedValueTypeIndex,
): CollectedStruct | undefined {
  if (typeof node.name !== "string") {
    return undefined;
  }

  const memberNodes: unknown[] = Array.isArray(node.members)
    ? node.members
    : [];
  const members: StructMember[] = [];

  for (const memberNode of memberNodes) {
    if (
      !isObject(memberNode) ||
      memberNode.nodeType !== "VariableDeclaration"
    ) {
      continue;
    }

    if (typeof memberNode.name !== "string") {
      continue;
    }

    members.push({
      name: memberNode.name,
      type: encodeMemberType(memberNode.typeName, userDefinedValueTypeI),
    });
  }

  return {
    name: node.name,
    members,
    sourcePath,
  };
}

/**
 * Converts a solc `typeName` AST node into its EIP-712 type string, following
 * the same conventions as `forge bind-json`:
 *
 *   - elementary types pass through (`address`, `uint256`, `string`, ...)
 *   - enums                  → `uint8`
 *   - contracts / interfaces → `address`
 *   - structs                → bare name (`Wallet.Person` → `Person`)
 *   - user-defined value types → underlying elementary type (`type Foo is bytes32` → `bytes32`)
 *   - arrays                 → `T[]` (dynamic) or `T[N]` (fixed)
 *   - mappings / functions   → `undefined` (not EIP-712 encodable)
 */
export function encodeMemberType(
  typeName: unknown,
  userDefinedValueTypeI: UserDefinedValueTypeIndex = new Map(),
): string | undefined {
  if (!isObject(typeName)) {
    return undefined;
  }

  switch (typeName.nodeType) {
    case "ElementaryTypeName": {
      // Prefer `typeDescriptions.typeString` over `name`: solc emits the
      // unresolved alias in `name` (`uint`, `int`, `byte`), but the canonical
      // EIP-712 type is in `typeString` (`uint256`, `int256`, `bytes1`).
      // `address payable` is the exception — `typeString` is `"address payable"`
      // while the canonical EIP-712 type is just `address`.
      const desc = isObject(typeName.typeDescriptions)
        ? typeName.typeDescriptions
        : undefined;
      const typeString =
        typeof desc?.typeString === "string" ? desc.typeString : undefined;
      if (typeString !== undefined) {
        return typeString.endsWith(" payable")
          ? typeString.slice(0, -" payable".length)
          : typeString;
      }

      return typeof typeName.name === "string" ? typeName.name : undefined;
    }

    case "UserDefinedTypeName": {
      // `typeDescriptions.typeString` is the only reliable way to tell what
      // kind of user-defined type this is — e.g. "struct Foo", "enum Bar",
      // "contract Token". The AST node itself doesn't say. Note that solc
      // emits the "contract " prefix for interface references as well.
      const desc = isObject(typeName.typeDescriptions)
        ? typeName.typeDescriptions
        : undefined;
      const typeString =
        typeof desc?.typeString === "string" ? desc.typeString : "";

      if (typeString.startsWith("enum ")) {
        return "uint8";
      }

      if (typeString.startsWith("contract ")) {
        return "address";
      }

      if (typeString.startsWith("struct ")) {
        // EIP-712 references structs by their bare name, so strip both the
        // "struct " prefix, any storage-location suffix solc may append
        // ("memory", "storage", ...), and any qualifier ("Wallet.Person").
        const remainder = typeString.slice("struct ".length).trim();
        const namePart = remainder.split(/\s+/)[0];
        const segments = namePart.split(".");
        return segments[segments.length - 1];
      }

      // User-defined value types (`type Foo is bytes32;`, solc 0.8.8+).
      // Resolve via `referencedDeclaration` against the build-wide
      // user-defined value type index
      // and recurse on the underlying elementary type — matching forge's
      // `Resolver::resolve_type` so `Foo h` encodes as `bytes32 h`, not `Foo h`.
      const refId =
        typeof typeName.referencedDeclaration === "number"
          ? typeName.referencedDeclaration
          : isObject(typeName.pathNode) &&
              typeof typeName.pathNode.referencedDeclaration === "number"
            ? typeName.pathNode.referencedDeclaration
            : undefined;

      if (refId !== undefined) {
        const underlying = userDefinedValueTypeI.get(refId);
        if (underlying !== undefined) {
          return encodeMemberType(underlying, userDefinedValueTypeI);
        }
      }

      // Fallback when the reference can't be resolved (missing
      // `referencedDeclaration`, or its definition wasn't in the build).
      // Emitting the name lets the downstream encoder produce a clear error
      // rather than failing silently here.
      if (typeof typeName.name === "string") {
        return typeName.name;
      }

      if (
        isObject(typeName.pathNode) &&
        typeof typeName.pathNode.name === "string"
      ) {
        const segments = typeName.pathNode.name.split(".");
        return segments[segments.length - 1];
      }

      return undefined;
    }

    case "ArrayTypeName": {
      const base = encodeMemberType(typeName.baseType, userDefinedValueTypeI);
      if (base === undefined) {
        return undefined;
      }

      // solc omits `length` entirely for dynamic arrays; it isn't emitted as `null`.
      const length = typeName.length;
      if (length === null || length === undefined) {
        return `${base}[]`;
      }

      // Always read from typeString: `Literal.value` preserves source text
      // (`0x100`, `1_000`) but typeString canonicalizes to decimal.
      const desc = isObject(typeName.typeDescriptions)
        ? typeName.typeDescriptions
        : undefined;
      const typeString =
        typeof desc?.typeString === "string" ? desc.typeString : "";
      const match = /\[(\d+)\]$/.exec(typeString);

      if (match !== null) {
        return `${base}[${match[1]}]`;
      }

      return undefined;
    }

    case "Mapping":
      return undefined;

    case "FunctionTypeName":
      // EIP-712 can't encode function types.
      return undefined;

    default:
      return undefined;
  }
}
