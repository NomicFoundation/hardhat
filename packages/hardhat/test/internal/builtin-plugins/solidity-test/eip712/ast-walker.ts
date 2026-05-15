import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildUserDefinedValueTypeIndex,
  encodeMemberType,
  extractStructsFromAst,
} from "../../../../../src/internal/builtin-plugins/solidity-test/eip712/ast-walker.js";

describe("eip712 - ast-walker", () => {
  describe("extractStructsFromAst", () => {
    describe("entry guard", () => {
      it("returns empty for non-SourceUnit AST", () => {
        assert.deepEqual(
          extractStructsFromAst({ nodeType: "Other" }, "a.sol"),
          [],
        );
      });
    });

    describe("StructDefinition (top-level)", () => {
      it("collects file-level struct definitions", () => {
        const ast = {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "StructDefinition",
              name: "Person",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  name: "wallet",
                  typeName: { nodeType: "ElementaryTypeName", name: "address" },
                },
                {
                  nodeType: "VariableDeclaration",
                  name: "name",
                  typeName: { nodeType: "ElementaryTypeName", name: "string" },
                },
              ],
            },
          ],
        };

        const out = extractStructsFromAst(ast, "test/Types.sol");

        assert.deepEqual(out, [
          {
            name: "Person",
            sourcePath: "test/Types.sol",
            members: [
              { name: "wallet", type: "address" },
              { name: "name", type: "string" },
            ],
          },
        ]);
      });
    });

    describe("ContractDefinition (nested structs)", () => {
      it("collects structs nested inside contracts", () => {
        const ast = {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "ContractDefinition",
              name: "Wallet",
              nodes: [
                {
                  nodeType: "StructDefinition",
                  name: "Owner",
                  members: [
                    {
                      nodeType: "VariableDeclaration",
                      name: "addr",
                      typeName: {
                        nodeType: "ElementaryTypeName",
                        name: "address",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        };

        const out = extractStructsFromAst(ast, "Wallet.sol");

        assert.deepEqual(out, [
          {
            name: "Owner",
            sourcePath: "Wallet.sol",
            members: [{ name: "addr", type: "address" }],
          },
        ]);
      });
    });

    describe("combined", () => {
      it("collects multiple structs from one file (file-level and contract-nested)", () => {
        const ast = {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "StructDefinition",
              name: "Outer",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  name: "x",
                  typeName: {
                    nodeType: "ElementaryTypeName",
                    name: "uint256",
                  },
                },
              ],
            },
            {
              nodeType: "ContractDefinition",
              name: "Wallet",
              nodes: [
                {
                  nodeType: "StructDefinition",
                  name: "Inner",
                  members: [
                    {
                      nodeType: "VariableDeclaration",
                      name: "y",
                      typeName: {
                        nodeType: "ElementaryTypeName",
                        name: "bool",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        };

        const out = extractStructsFromAst(ast, "Mixed.sol");

        assert.deepEqual(out, [
          {
            name: "Outer",
            sourcePath: "Mixed.sol",
            members: [{ name: "x", type: "uint256" }],
          },
          {
            name: "Inner",
            sourcePath: "Mixed.sol",
            members: [{ name: "y", type: "bool" }],
          },
        ]);
      });
    });

    describe("collectStruct (member collection)", () => {
      it("drops members with no name", () => {
        const ast = {
          nodeType: "SourceUnit",
          nodes: [
            {
              nodeType: "StructDefinition",
              name: "Anon",
              members: [
                {
                  nodeType: "VariableDeclaration",
                  typeName: { nodeType: "ElementaryTypeName", name: "uint256" },
                },
                {
                  nodeType: "VariableDeclaration",
                  name: "x",
                  typeName: { nodeType: "ElementaryTypeName", name: "uint256" },
                },
              ],
            },
          ],
        };

        const out = extractStructsFromAst(ast, "Anon.sol");

        assert.deepEqual(out, [
          {
            name: "Anon",
            sourcePath: "Anon.sol",
            members: [{ name: "x", type: "uint256" }],
          },
        ]);
      });
    });
  });

  describe("encodeMemberType", () => {
    describe("entry guard", () => {
      it("returns undefined for non-object input", () => {
        assert.equal(encodeMemberType(null), undefined);
        assert.equal(encodeMemberType(undefined), undefined);
        assert.equal(encodeMemberType("uint256"), undefined);
        assert.equal(encodeMemberType(42), undefined);
        assert.equal(encodeMemberType([]), undefined);
      });
    });

    describe("ElementaryTypeName", () => {
      it("encodes elementary types verbatim", () => {
        assert.equal(
          encodeMemberType({ nodeType: "ElementaryTypeName", name: "uint256" }),
          "uint256",
        );
      });

      it("returns undefined for elementary types with no name", () => {
        assert.equal(
          encodeMemberType({ nodeType: "ElementaryTypeName" }),
          undefined,
        );
      });
    });

    describe("UserDefinedTypeName", () => {
      it("encodes enums as uint8", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "enum Status" },
          }),
          "uint8",
        );
      });

      it("encodes contracts and interfaces as address", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "contract MyToken" },
          }),
          "address",
        );
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "interface IFoo" },
          }),
          "address",
        );
      });

      it("encodes structs as their bare name (qualified path is ignored)", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "struct Wallet.Person" },
          }),
          "Person",
        );
      });

      it("strips storage-location suffix from qualified struct names", () => {
        // solc emits e.g. `struct MyLib.Bar memory` for memory-located struct
        // references; we need just `Bar`.
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "struct MyLib.Bar memory" },
          }),
          "Bar",
        );
      });

      it("resolves user-defined value types to their underlying elementary type", () => {
        // `type MyUint is uint256;` should encode as `uint256`
        const userDefinedValueTypeI = new Map<number, Record<string, unknown>>([
          [42, { nodeType: "ElementaryTypeName", name: "uint256" }],
        ]);

        assert.equal(
          encodeMemberType(
            {
              nodeType: "UserDefinedTypeName",
              name: "MyUint",
              referencedDeclaration: 42,
              typeDescriptions: { typeString: "MyUint" },
            },
            userDefinedValueTypeI,
          ),
          "uint256",
        );
      });

      it("resolves user-defined value types via pathNode.referencedDeclaration too", () => {
        // Newer solc emits the reference id on `pathNode` rather than the
        // top-level node.
        const userDefinedValueTypeI = new Map<number, Record<string, unknown>>([
          [99, { nodeType: "ElementaryTypeName", name: "bytes32" }],
        ]);

        assert.equal(
          encodeMemberType(
            {
              nodeType: "UserDefinedTypeName",
              typeDescriptions: { typeString: "MyLib.MyHash" },
              pathNode: { name: "MyLib.MyHash", referencedDeclaration: 99 },
            },
            userDefinedValueTypeI,
          ),
          "bytes32",
        );
      });

      it("falls back to typeName.name when the user-defined value type reference can't be resolved", () => {
        // No `referencedDeclaration`, or the id isn't in the index — emit the
        // alias name so the downstream encoder produces a clear error.
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            name: "MyUint",
            typeDescriptions: { typeString: "MyUint" },
          }),
          "MyUint",
        );
      });

      it("falls back to typeName.pathNode.name when no local name is present", () => {
        // Newer solc emits UserDefinedTypeName with a `pathNode` instead of a
        // flat `name`; take the last segment of its qualified path.
        assert.equal(
          encodeMemberType({
            nodeType: "UserDefinedTypeName",
            typeDescriptions: { typeString: "MyLib.MyUint" },
            pathNode: { name: "MyLib.MyUint" },
          }),
          "MyUint",
        );
      });

      it("returns undefined when no recognized typeString, name, or pathNode is present", () => {
        assert.equal(
          encodeMemberType({ nodeType: "UserDefinedTypeName" }),
          undefined,
        );
      });
    });

    describe("ArrayTypeName", () => {
      it("returns undefined when the base type is not encodable", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: {
              nodeType: "Mapping",
              keyType: { nodeType: "ElementaryTypeName", name: "address" },
              valueType: { nodeType: "ElementaryTypeName", name: "uint256" },
            },
            length: null,
          }),
          undefined,
        );
      });

      it("encodes dynamic struct arrays with []", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: {
              nodeType: "UserDefinedTypeName",
              typeDescriptions: { typeString: "struct Item" },
            },
            length: null,
          }),
          "Item[]",
        );
      });

      it("encodes fixed-size arrays with [N] using the literal value", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: { nodeType: "ElementaryTypeName", name: "uint256" },
            length: { nodeType: "Literal", value: "3" },
          }),
          "uint256[3]",
        );
      });

      it("falls back to typeString for fixed-size with constant-expr length", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: { nodeType: "ElementaryTypeName", name: "uint256" },
            length: { nodeType: "Identifier", name: "N" },
            typeDescriptions: { typeString: "uint256[5]" },
          }),
          "uint256[5]",
        );
      });

      it("returns undefined when length is non-literal and typeString has no resolved size", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: { nodeType: "ElementaryTypeName", name: "uint256" },
            length: { nodeType: "Identifier", name: "N" },
          }),
          undefined,
        );
      });

      it("forwards the user-defined value type index through array recursion", () => {
        // `MyHash[]` where `type MyHash is bytes32` should encode as `bytes32[]`.
        const userDefinedValueTypeI = new Map<number, Record<string, unknown>>([
          [7, { nodeType: "ElementaryTypeName", name: "bytes32" }],
        ]);

        assert.equal(
          encodeMemberType(
            {
              nodeType: "ArrayTypeName",
              baseType: {
                nodeType: "UserDefinedTypeName",
                name: "MyHash",
                referencedDeclaration: 7,
                typeDescriptions: { typeString: "MyHash" },
              },
              length: null,
            },
            userDefinedValueTypeI,
          ),
          "bytes32[]",
        );
      });
    });

    describe("Mapping", () => {
      it("returns undefined for mappings", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "Mapping",
            keyType: { nodeType: "ElementaryTypeName", name: "address" },
            valueType: { nodeType: "ElementaryTypeName", name: "uint256" },
          }),
          undefined,
        );
      });
    });

    describe("FunctionTypeName", () => {
      it("returns undefined for function types", () => {
        assert.equal(
          encodeMemberType({ nodeType: "FunctionTypeName" }),
          undefined,
        );
      });
    });

    describe("default", () => {
      it("returns undefined for unknown node types", () => {
        assert.equal(
          encodeMemberType({ nodeType: "SomeFutureTypeName" }),
          undefined,
        );
      });
    });
  });

  describe("buildUserDefinedValueTypeIndex", () => {
    it("indexes file-level user-defined value type definitions by node id", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "UserDefinedValueTypeDefinition",
            id: 11,
            name: "MyUint",
            underlyingType: { nodeType: "ElementaryTypeName", name: "uint256" },
          },
        ],
      };

      const index = buildUserDefinedValueTypeIndex([ast]);

      assert.equal(index.size, 1);
      assert.deepEqual(index.get(11), {
        nodeType: "ElementaryTypeName",
        name: "uint256",
      });
    });

    it("indexes user-defined value types nested inside contracts", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "ContractDefinition",
            nodes: [
              {
                nodeType: "UserDefinedValueTypeDefinition",
                id: 22,
                name: "MyHash",
                underlyingType: {
                  nodeType: "ElementaryTypeName",
                  name: "bytes32",
                },
              },
            ],
          },
        ],
      };

      const index = buildUserDefinedValueTypeIndex([ast]);

      assert.deepEqual(index.get(22), {
        nodeType: "ElementaryTypeName",
        name: "bytes32",
      });
    });

    it("merges definitions from multiple ASTs", () => {
      const astA = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "UserDefinedValueTypeDefinition",
            id: 1,
            underlyingType: { nodeType: "ElementaryTypeName", name: "uint256" },
          },
        ],
      };
      const astB = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "UserDefinedValueTypeDefinition",
            id: 2,
            underlyingType: { nodeType: "ElementaryTypeName", name: "address" },
          },
        ],
      };

      const index = buildUserDefinedValueTypeIndex([astA, astB]);

      assert.equal(index.size, 2);
      assert.deepEqual(index.get(1), {
        nodeType: "ElementaryTypeName",
        name: "uint256",
      });
      assert.deepEqual(index.get(2), {
        nodeType: "ElementaryTypeName",
        name: "address",
      });
    });

    it("ignores definitions whose underlyingType is not an ElementaryTypeName", () => {
      const ast = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "UserDefinedValueTypeDefinition",
            id: 33,
            // Not actually possible in Solidity, but the walker should be
            // defensive about malformed/foreign-source ASTs.
            underlyingType: { nodeType: "UserDefinedTypeName" },
          },
        ],
      };

      assert.equal(buildUserDefinedValueTypeIndex([ast]).size, 0);
    });

    it("ignores non-SourceUnit roots", () => {
      assert.equal(
        buildUserDefinedValueTypeIndex([{ nodeType: "Other" }, null, 42]).size,
        0,
      );
    });
  });

  describe("extractStructsFromAst with user-defined value type index", () => {
    it("resolves a struct member whose type is a user-defined value type to the underlying type", () => {
      // `type Bytes32 is bytes32; struct Foo { Bytes32 h; }` — the EIP-712
      // string must be `Foo(bytes32 h)`, not `Foo(Bytes32 h)`.
      const userDefinedValueTypeAst = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "UserDefinedValueTypeDefinition",
            id: 100,
            name: "Bytes32",
            underlyingType: {
              nodeType: "ElementaryTypeName",
              name: "bytes32",
            },
          },
        ],
      };

      const structAst = {
        nodeType: "SourceUnit",
        nodes: [
          {
            nodeType: "StructDefinition",
            name: "Foo",
            members: [
              {
                nodeType: "VariableDeclaration",
                name: "h",
                typeName: {
                  nodeType: "UserDefinedTypeName",
                  name: "Bytes32",
                  referencedDeclaration: 100,
                  typeDescriptions: { typeString: "Bytes32" },
                },
              },
            ],
          },
        ],
      };

      const userDefinedValueTypeI = buildUserDefinedValueTypeIndex([
        userDefinedValueTypeAst,
        structAst,
      ]);
      const out = extractStructsFromAst(
        structAst,
        "Foo.sol",
        userDefinedValueTypeI,
      );

      assert.deepEqual(out, [
        {
          name: "Foo",
          sourcePath: "Foo.sol",
          members: [{ name: "h", type: "bytes32" }],
        },
      ]);
    });
  });
});
