// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { PRBMathCastingUint40 as CastingUint40 } from "src/casting/Uint40.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../Base.t.sol";

/// @dev Collection of tests for the casting library available for uint40.
contract CastingUint40_Test is Base_Test {
    using CastingUint40 for uint40;

    function testFuzz_intoSD1x18(uint40 x) external pure {
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(uint64(x)));
        assertEq(actual, expected, "uint40 intoSD1x18");
    }

    function testFuzz_intoSD59x18(uint40 x) external pure {
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(uint256(x)));
        assertEq(actual, expected, "uint40 intoSD59x18");
    }

    function testFuzz_intoUD2x18(uint40 x) external pure {
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(x));
        assertEq(actual, expected, "uint40 intoUD2x18");
    }

    function testFuzz_intoUD60x18(uint40 x) external pure {
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(uint256(x));
        assertEq(actual, expected, "uint40 intoUD60x18");
    }
}
