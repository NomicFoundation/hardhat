// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { ud } from "src/ud60x18/Casting.sol";
import {
    add,
    and,
    eq,
    gt,
    gte,
    isZero,
    lshift,
    lt,
    lte,
    mod,
    neq,
    or,
    rshift,
    sub,
    uncheckedAdd,
    uncheckedSub,
    xor,
    not
} from "src/ud60x18/Helpers.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the helpers functions available in the UD60x18 type.
contract UD60x18_Helpers_Fuzz_Test is Base_Test {
    uint256 internal constant HALF_MAX_UINT256 = type(uint256).max / 2;

    function testFuzz_Add(UD60x18 x, UD60x18 y) external pure {
        x = _bound(x, 0, HALF_MAX_UINT256);
        y = _bound(y, 0, HALF_MAX_UINT256);
        UD60x18 expected = ud(x.unwrap() + y.unwrap());
        assertEq(add(x, y), expected, "UD60x18 add");
        assertEq(x + y, expected, "UD60x18 +");
    }

    function testFuzz_And(uint256 x, uint256 y) external pure {
        UD60x18 expected = ud(x & y);
        assertEq(and(ud(x), y), expected, "UD60x18 and");
        assertEq(ud(x) & ud(y), expected, "UD60x18 &");
    }

    function testFuzz_Eq(uint256 x) external pure {
        uint256 y = x;
        assertTrue(eq(ud(x), ud(y)), "UD60x18 eq");
        assertTrue(ud(x) == ud(y), "UD60x18 ==");
    }

    function testFuzz_Gt(uint256 x, uint256 y) external pure {
        vm.assume(x > y);
        assertTrue(gt(ud(x), ud(y)), "UD60x18 gt");
        assertTrue(ud(x) > ud(y), "UD60x18 >");
    }

    function testFuzz_Gte(uint256 x, uint256 y) external pure {
        vm.assume(x >= y);
        assertTrue(gte(ud(x), ud(y)), "UD60x18 gte");
        assertTrue(ud(x) >= ud(y), "UD60x18 >=");
    }

    function testFuzz_IsZero(UD60x18 x) external pure {
        bool actual = isZero(x);
        bool expected = x == ud(0);
        assertEq(actual, expected, "SD59x18 isZero");
    }

    function testFuzz_Lshift(uint256 x, uint256 y) external pure {
        vm.assume(y <= 512);
        UD60x18 expected = ud(x << y);
        assertEq(lshift(ud(x), y), expected, "UD60x18 lshift");
    }

    function testFuzz_Lt(uint256 x, uint256 y) external pure {
        vm.assume(x < y);
        assertTrue(lt(ud(x), ud(y)), "UD60x18 lt");
        assertTrue(ud(x) < ud(y), "UD60x18 <");
    }

    function testFuzz_Lte(uint256 x, uint256 y) external pure {
        vm.assume(x <= y);
        assertTrue(lte(ud(x), ud(y)), "UD60x18 lte");
        assertTrue(ud(x) <= ud(y), "UD60x18 <=");
    }

    function testFuzz_Mod(uint256 x, uint256 y) external pure {
        vm.assume(y > 0);
        UD60x18 expected = ud(x % y);
        assertEq(mod(ud(x), ud(y)), expected, "UD60x18 mod");
        assertEq(ud(x) % ud(y), expected, "UD60x18 %");
    }

    function testFuzz_Neq(uint256 x, uint256 y) external pure {
        vm.assume(x != y);
        assertTrue(neq(ud(x), ud(y)), "UD60x18 neq");
        assertTrue(ud(x) != ud(y), "UD60x18 !=");
    }

    function testFuzz_Not(uint256 x) external pure {
        UD60x18 expected = ud(~x);
        assertEq(not(ud(x)), expected, "UD60x18 not");
        assertEq(~ud(x), expected, "UD60x18 ~");
    }

    function testFuzz_Or(uint256 x, uint256 y) external pure {
        UD60x18 expected = ud(x | y);
        assertEq(or(ud(x), ud(y)), expected, "UD60x18 or");
        assertEq(ud(x) | ud(y), expected, "UD60x18 |");
    }

    function testFuzz_Rshift(uint256 x, uint256 y) external pure {
        vm.assume(y <= 512);
        UD60x18 expected = ud(x >> y);
        assertEq(rshift(ud(x), y), expected, "UD60x18 rshift");
    }

    function testFuzz_Sub(uint256 x, uint256 y) external pure {
        vm.assume(x >= y);
        UD60x18 expected = ud(x - y);
        assertEq(sub(ud(x), ud(y)), expected, "UD60x18 sub");
        assertEq(ud(x) - ud(y), expected, "UD60x18 -");
    }

    function testFuzz_UncheckedAdd(uint256 x, uint256 y) external pure {
        unchecked {
            UD60x18 expected = ud(x + y);
            UD60x18 actual = uncheckedAdd(ud(x), ud(y));
            assertEq(actual, expected, "UD60x18 uncheckedAdd");
        }
    }

    function testFuzz_UncheckedSub(uint256 x, uint256 y) external pure {
        unchecked {
            UD60x18 expected = ud(x - y);
            UD60x18 actual = uncheckedSub(ud(x), ud(y));
            assertEq(actual, expected, "UD60x18 uncheckedSub");
        }
    }

    function testFuzz_Xor(uint256 x, uint256 y) external pure {
        UD60x18 expected = ud(x ^ y);
        assertEq(xor(ud(x), ud(y)), expected, "UD60x18 xor");
        assertEq(ud(x) ^ ud(y), expected, "UD60x18 ^");
    }
}
