import { assert } from "chai";

import { Parser } from "../../../src/internal/solidity/parse";

describe("Solidity parser", () => {
  describe("imports", () => {
    it("should work with global imports", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
import "./asd.sol";
pragma experimental v0.5.0;
import "lib/asd.sol";
  `,
        "",
        ""
      );

      assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
    });

    it("should work with star imports", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
import * as from "./asd.sol";
pragma experimental v0.5.0;
import * as from "lib/asd.sol";
  `,
        "",
        ""
      );

      assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
    });

    it("should work with selective imports", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
import {symbol1} from "./asd.sol";
pragma experimental v0.5.0;
import {symbol1, symbol2} as from "lib/asd.sol";
  `,
        "",
        ""
      );

      assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
    });

    it("should work with aliased imports", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
import {symbol1 as s1} as from "./asd.sol";
pragma experimental v0.5.0;
import {symbol1 as s1, symbol2} as from "lib/asd.sol";
  `,
        "",
        ""
      );

      assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
    });

    it("If the syntax is invalid but there's still some valid imports' they should be returned", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
    asd
import "./asd.sol";
fgh {;

(

import "./1.sol";
            address a,
            uint256 b,
            bytes memory a
        ) = []
      
    `,
        "",
        ""
      );

      assert.deepEqual(imports, ["./asd.sol", "./1.sol"]);
    });

    it("Should work when the parser doesn't detect some invalid syntax and the visitor breaks", () => {
      const parser = new Parser();
      const { imports } = parser.parse(
        `
      import "a.sol";

      contract C {
        fallback () function {

        }
      }
    `,
        "",
        ""
      );

      assert.deepEqual(imports, ["a.sol"]);
    });
  });

  describe("version pragmas", () => {
    it("should work with a single fixed version", () => {
      const parser = new Parser();
      const { versionPragmas } = parser.parse(
        `
pragma solidity 0.5.0;

import "./Bar.sol;";

contract Foo {}
  `,
        "",
        ""
      );

      assert.deepEqual(versionPragmas, ["0.5.0"]);
    });

    it("should work with a single version range", () => {
      const parser = new Parser();
      const { versionPragmas } = parser.parse(
        `
pragma solidity ^0.5.0;

import "./Bar.sol;";

contract Foo {}
  `,
        "",
        ""
      );

      assert.deepEqual(versionPragmas, ["^0.5.0"]);
    });

    it("should work with two version ranges", () => {
      const parser = new Parser();
      const { versionPragmas } = parser.parse(
        `
pragma solidity ^0.5.0;

import "./Bar.sol;";

contract Foo {}

pragma solidity ^0.5.1;

contract Qux {}
  `,
        "",
        ""
      );

      assert.deepEqual(versionPragmas, ["^0.5.0", "^0.5.1"]);
    });

    it("should work with one ||", () => {
      const parser = new Parser();
      const { versionPragmas } = parser.parse(
        `pragma solidity ^0.5.0 || ^0.6.0;`,
        "",
        ""
      );

      assert.deepEqual(versionPragmas, ["^0.5.0 || ^0.6.0"]);
    });

    it("should work with two ||", () => {
      const parser = new Parser();
      const { versionPragmas } = parser.parse(
        `pragma solidity ^0.5.0 || ^0.6.0 || ^0.7.0;`,
        "",
        ""
      );

      assert.deepEqual(versionPragmas, ["^0.5.0 || ^0.6.0 || ^0.7.0"]);
    });
  });
});
