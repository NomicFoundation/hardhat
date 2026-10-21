import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  formatSignature,
  parseSignature,
} from "../../../../../../src/internal/builtin-plugins/hhu/tasks/abi/signature.js";

describe("hhu abi signature parser", () => {
  describe("parseSignature", () => {
    it("parses a name and its input types, normalizing integer aliases", () => {
      assert.deepEqual(parseSignature("f(uint,int,address,bool,bytes32)"), {
        name: "f",
        inputs: [
          { type: "uint256" },
          { type: "int256" },
          { type: "address" },
          { type: "bool" },
          { type: "bytes32" },
        ],
        outputs: [],
      });
    });

    it("parses an empty parameter list", () => {
      assert.deepEqual(parseSignature("f()"), {
        name: "f",
        inputs: [],
        outputs: [],
      });
    });

    it("parses a bare parameter list without a name", () => {
      assert.deepEqual(parseSignature("(uint256,string)"), {
        name: "",
        inputs: [{ type: "uint256" }, { type: "string" }],
        outputs: [],
      });
    });

    it("parses parameter names, and the indexed and data location keywords", () => {
      assert.deepEqual(
        parseSignature(
          "E(address indexed from, string memory name, bytes calldata, address payable to, address payable[] storage tos)",
        ),
        {
          name: "E",
          inputs: [
            { type: "address", name: "from", indexed: true },
            { type: "string", name: "name" },
            { type: "bytes" },
            { type: "address", name: "to" },
            { type: "address[]", name: "tos" },
          ],
          outputs: [],
        },
      );
    });

    it("parses arrays and nested tuples, in both tuple syntaxes", () => {
      assert.deepEqual(
        parseSignature(
          "f(uint8[2][] xs, (address a, tuple(bool, bytes)[3] b)[] t)",
        ),
        {
          name: "f",
          inputs: [
            { type: "uint8[2][]", name: "xs" },
            {
              type: "tuple[]",
              name: "t",
              components: [
                { type: "address", name: "a" },
                {
                  type: "tuple[3]",
                  name: "b",
                  components: [{ type: "bool" }, { type: "bytes" }],
                },
              ],
            },
          ],
          outputs: [],
        },
      );
    });

    it("parses return types, with and without the returns keyword", () => {
      const expected = {
        name: "f",
        inputs: [{ type: "uint256" }],
        outputs: [{ type: "bool" }, { type: "uint256" }],
      };

      assert.deepEqual(parseSignature("f(uint256)(bool,uint)"), expected);
      assert.deepEqual(
        parseSignature("f(uint256) returns (bool,uint)"),
        expected,
      );
    });

    it("parses whole Solidity declarations", () => {
      assert.deepEqual(
        parseSignature(
          "  function balanceOf(address owner) external view returns (uint256 balance);  ",
        ),
        {
          name: "balanceOf",
          inputs: [{ type: "address", name: "owner" }],
          outputs: [{ type: "uint256", name: "balance" }],
        },
      );

      assert.deepEqual(
        parseSignature(
          "function supportsInterface(bytes4 id) public view virtual override(ERC165, AccessControl) returns (bool) {",
        ),
        {
          name: "supportsInterface",
          inputs: [{ type: "bytes4", name: "id" }],
          outputs: [{ type: "bool" }],
        },
      );

      assert.deepEqual(
        parseSignature(
          "function mint(address to, uint256 amount) external onlyRole(getRoleAdmin(MINTER_ROLE)) initializer(2) whenNotPaused { _mint(to, amount); }",
        ),
        {
          name: "mint",
          inputs: [
            { type: "address", name: "to" },
            { type: "uint256", name: "amount" },
          ],
          outputs: [],
        },
      );

      assert.deepEqual(
        parseSignature(
          "function getPool(address asset) external view returns (IPool pool, DataTypes.ReserveData memory)",
        ),
        {
          name: "getPool",
          inputs: [{ type: "address", name: "asset" }],
          outputs: [
            { type: "IPool", name: "pool" },
            { type: "DataTypes.ReserveData" },
          ],
        },
      );

      assert.deepEqual(parseSignature("event Ping() anonymous;"), {
        name: "Ping",
        inputs: [],
        outputs: [],
      });

      assert.deepEqual(parseSignature("error Unauthorized(address)"), {
        name: "Unauthorized",
        inputs: [{ type: "address" }],
        outputs: [],
      });
    });

    for (const [signature, reason] of [
      ["", "it's incomplete"],
      ["transfer", "it's incomplete"],
      ["f(uint256", "it's incomplete"],
      ["f(uint256) returns", "it's incomplete"],
      ["f(uint256,)", 'unexpected ")"'],
      ["f(uint256))", 'unexpected ")"'],
      ["f(uint256) onlyRole(ROLE", "it's incomplete"],
      ["f(address uint256)", 'unexpected "uint256"'],
      ["f(uint256,address bool)", 'unexpected "bool"'],
      ["f(uint256 #)", 'unexpected "#"'],
      ["f(uint256[0])", 'unexpected "["'],
      ["f(uint256[)", 'unexpected "["'],
      ["f(uint256) external; }", 'unexpected "}"'],
      ["f(unit256)", 'unknown type "unit256"'],
      ["f(uint7)", 'unknown type "uint7"'],
      ["f(uint512)", 'unknown type "uint512"'],
      ["f(bytes33)", 'unknown type "bytes33"'],
      ["f(MyStruct)", 'unknown type "MyStruct"'],
      ["f() returns (DataTypes.)", 'unexpected ")"'],
    ]) {
      it(`throws for "${signature}"`, () => {
        assertThrowsHardhatError(
          () => parseSignature(signature),
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
          { value: signature, name: "signature", reason },
        );
      });
    }
  });

  describe("formatSignature", () => {
    it("formats the canonical signature, without names nor return types", () => {
      assert.equal(
        formatSignature(
          parseSignature(
            "function f(uint a, (address b, (bool c)[2] d)[] e) returns (bool)",
          ),
        ),
        "f(uint256,(address,(bool)[2])[])",
      );
    });
  });
});
