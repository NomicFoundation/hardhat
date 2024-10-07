// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { UNIT, ZERO } from "src/ud60x18/Constants.sol";
import { pow } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../../Base.t.sol";

contract Pow_Fuzz_Test is Base_Test {
    function testFuzz_Pow_BaseZero_ExponentNotZero(UD60x18 y) external pure {
        vm.assume(y != ZERO);
        UD60x18 x = ZERO;
        UD60x18 actual = pow(x, y);
        UD60x18 expected = ZERO;
        assertEq(actual, expected, "UD60x18 pow");
    }

    modifier whenBaseNotZero() {
        _;
    }

    function testFuzz_Pow_BaseUnit(UD60x18 y) external pure whenBaseNotZero {
        UD60x18 x = UNIT;
        UD60x18 actual = pow(x, y);
        UD60x18 expected = UNIT;
        assertEq(actual, expected, "UD60x18 pow");
    }

    modifier whenBaseNotUnit() {
        _;
    }

    function testFuzz_Pow_ExponentZero(UD60x18 x) external pure whenBaseNotZero whenBaseNotUnit {
        vm.assume(x != ZERO && x != UNIT);
        UD60x18 y = ZERO;
        UD60x18 actual = pow(x, y);
        UD60x18 expected = UNIT;
        assertEq(actual, expected, "UD60x18 pow");
    }

    modifier whenExponentNotZero() {
        _;
    }

    function testFuzz_Pow_ExponentUnit(UD60x18 x) external pure whenBaseNotZero whenBaseNotUnit whenExponentNotZero {
        vm.assume(x != ZERO && x != UNIT);
        UD60x18 y = UNIT;
        UD60x18 actual = pow(x, y);
        UD60x18 expected = x;
        assertEq(actual, expected, "UD60x18 pow");
    }
}
