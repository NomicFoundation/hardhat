import { assert } from "chai";

import { getImports } from "../../../src/internal/solidity/imports";

describe("Imports extractor", () => {
  it("should work with global imports", () => {
    const imports = getImports(`
import "./asd.sol";
pragma experimental v0.5.0;
import "lib/asd.sol";
  `);

    assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
  });

  it("should work with star imports", () => {
    const imports = getImports(`
import * as from "./asd.sol";
pragma experimental v0.5.0;
import * as from "lib/asd.sol";
  `);

    assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
  });

  it("should work with selective imports", () => {
    const imports = getImports(`
import {symbol1} from "./asd.sol";
pragma experimental v0.5.0;
import {symbol1, symbol2} as from "lib/asd.sol";
  `);

    assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
  });

  it("should work with aliased imports", () => {
    const imports = getImports(`
import {symbol1 as s1} as from "./asd.sol";
pragma experimental v0.5.0;
import {symbol1 as s1, symbol2} as from "lib/asd.sol";
  `);

    assert.deepEqual(imports, ["./asd.sol", "lib/asd.sol"]);
  });

  it("If the syntax is invalid but there's still some valid imports' they should be returned", () => {
    const imports = getImports(`
    asd
import "./asd.sol";
fgh {;

(

import "./1.sol";
            address a,
            uint256 b,
            bytes memory a
        ) = []
      
    `);

    assert.deepEqual(imports, ["./asd.sol", "./1.sol"]);
  });
});
