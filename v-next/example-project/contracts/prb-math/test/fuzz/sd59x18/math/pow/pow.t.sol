// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { UNIT, ZERO } from "src/sd59x18/Constants.sol";
import { pow } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { Base_Test } from "../../../../Base.t.sol";

contract Pow_Fuzz_Test is Base_Test {
    function testFuzz_Pow_BaseZero_ExponentNotZero(SD59x18 y) external pure {
        vm.assume(y != ZERO);
        SD59x18 x = ZERO;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenBaseNotZero() {
        _;
    }

    function testFuzz_Pow_BaseUnit(SD59x18 y) external pure whenBaseNotZero {
        SD59x18 x = UNIT;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenBaseNotUnit() {
        _;
    }

    function testFuzz_Pow_ExponentZero(SD59x18 x) external pure whenBaseNotZero whenBaseNotUnit {
        vm.assume(x != ZERO && x != UNIT);
        SD59x18 y = ZERO;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenExponentNotZero() {
        _;
    }

    function testFuzz_Pow_ExponentUnit(SD59x18 x) external pure whenBaseNotZero whenBaseNotUnit whenExponentNotZero {
        vm.assume(x != ZERO && x != UNIT);
        SD59x18 y = UNIT;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = x;
        assertEq(actual, expected, "SD59x18 pow");
    }
}
