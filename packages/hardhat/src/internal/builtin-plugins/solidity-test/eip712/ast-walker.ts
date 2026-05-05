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
 * Returns every struct definition reachable from a solc source AST (Abstract Syntax Tree),
 * including structs nested inside contracts.
 */
export function extractStructsFromAst(
  ast: unknown,
  sourcePath: string,
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
      const collected = collectStruct(node, sourcePath);
      if (collected !== undefined) {
        results.push(collected);
      }
    } else if (node.nodeType === "ContractDefinition") {
      const members: unknown[] = Array.isArray(node.nodes) ? node.nodes : [];
      for (const member of members) {
        if (isObject(member) && member.nodeType === "StructDefinition") {
          const collected = collectStruct(member, sourcePath);
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
      type: encodeMemberType(memberNode.typeName),
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
 *   - arrays                 → `T[]` (dynamic) or `T[N]` (fixed)
 *   - mappings / functions   → `undefined` (not EIP-712 encodable)
 */
export function encodeMemberType(typeName: unknown): string | undefined {
  if (!isObject(typeName)) {
    return undefined;
  }

  switch (typeName.nodeType) {
    case "ElementaryTypeName": {
      return typeof typeName.name === "string" ? typeName.name : undefined;
    }

    case "UserDefinedTypeName": {
      // `typeDescriptions.typeString` is the only reliable way to tell what
      // kind of user-defined type this is — e.g. "struct Foo", "enum Bar",
      // "contract Token", "interface IFoo". The AST node itself doesn't say.
      const desc = isObject(typeName.typeDescriptions)
        ? typeName.typeDescriptions
        : undefined;
      const typeString =
        typeof desc?.typeString === "string" ? desc.typeString : "";

      if (typeString.startsWith("enum ")) {
        return "uint8";
      }

      if (
        typeString.startsWith("contract ") ||
        typeString.startsWith("interface ")
      ) {
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

      // Fallback for user-defined value types (solc 0.8.8+) and type aliases.
      // Some of these aren't EIP-712 encodable; emitting the name lets the
      // downstream encoder produce a clear error rather than failing here.
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
      const base = encodeMemberType(typeName.baseType);
      if (base === undefined) {
        return undefined;
      }

      const length = typeName.length;
      if (length === null || length === undefined) {
        return `${base}[]`;
      }

      if (
        isObject(length) &&
        length.nodeType === "Literal" &&
        typeof length.value === "string"
      ) {
        return `${base}[${length.value}]`;
      }

      // The length wasn't a plain literal (e.g. `uint[CONST]`). solc still
      // records the resolved size in the array's `typeString`, so parse it
      // from there.
      const desc = isObject(typeName.typeDescriptions)
        ? typeName.typeDescriptions
        : undefined;
      const typeString =
        typeof desc?.typeString === "string" ? desc.typeString : "";
      const match = /\[(\d+)\]$/.exec(typeString);

      if (match !== null) {
        return `${base}[${match[1]}]`;
      }

      return `${base}[]`;
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
