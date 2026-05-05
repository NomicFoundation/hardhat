import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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

      it("falls back to typeName.name for user-defined value types", () => {
        // User-defined value types (`type MyUint is uint256;`, solc 0.8.8+) emit a typeString that
        // doesn't match enum/contract/interface/struct, so we fall back to the
        // node's local `name`.
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

      it("falls back to [] when length is non-literal and typeString has no resolved size", () => {
        assert.equal(
          encodeMemberType({
            nodeType: "ArrayTypeName",
            baseType: { nodeType: "ElementaryTypeName", name: "uint256" },
            length: { nodeType: "Identifier", name: "N" },
          }),
          "uint256[]",
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
});
