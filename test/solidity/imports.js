const assert = require("chai").assert;
const { getImports } = require("../../src/solidity/imports");

describe("lazy module", () => {
  it("should return the imported files", () => {
    const imports = getImports(`
import "./asd.sol";
import "lib/asd.sol";
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
