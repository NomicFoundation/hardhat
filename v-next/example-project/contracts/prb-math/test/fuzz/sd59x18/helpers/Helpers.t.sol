// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
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
    unary,
    uncheckedAdd,
    uncheckedSub,
    xor,
    not
} from "src/sd59x18/Helpers.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the helpers functions available in the SD59x18 type.
contract SD59x18_Helpers_Fuzz_Test is Base_Test {
    int256 internal constant HALF_MAX_INT256 = MAX_INT256 / 2;
    int256 internal constant HALF_MIN_INT256 = MIN_INT256 / 2;

    function testFuzz_Add(SD59x18 x, SD59x18 y) external pure {
        x = _bound(x, HALF_MIN_INT256, HALF_MAX_INT256);
        y = _bound(y, HALF_MIN_INT256, HALF_MAX_INT256);
        SD59x18 expected = sd(x.unwrap() + y.unwrap());
        assertEq(add(x, y), expected, "SD59x18 add");
        assertEq(x + y, expected, "SD59x18 +");
    }

    function testFuzz_And(int256 x, int256 y) external pure {
        SD59x18 expected = sd(x & y);
        assertEq(and(sd(x), y), expected, "SD59x18 and");
        assertEq(sd(x) & sd(y), expected, "SD59x18 &");
    }

    function testFuzz_Eq(int256 x) external pure {
        int256 y = x;
        assertTrue(eq(sd(x), sd(y)), "SD59x18 eq");
        assertTrue(sd(x) == sd(y), "SD59x18 ==");
    }

    function testFuzz_Gt(int256 x, int256 y) external pure {
        vm.assume(x > y);
        assertTrue(gt(sd(x), sd(y)), "SD59x18 gt");
        assertTrue(sd(x) > sd(y), "SD59x18 >");
    }

    function testFuzz_Gte(int256 x, int256 y) external pure {
        vm.assume(x >= y);
        assertTrue(gte(sd(x), sd(y)), "SD59x18 gte");
        assertTrue(sd(x) >= sd(y), "SD59x18 >=");
    }

    function testFuzz_IsZero(SD59x18 x) external pure {
        bool actual = isZero(x);
        bool expected = x == sd(0);
        assertEq(actual, expected, "SD59x18 isZero");
    }

    function testFuzz_Lshift(int256 x, uint256 y) external pure {
        _bound(y, 0, 512);
        SD59x18 expected = sd(x << y);
        assertEq(lshift(sd(x), y), expected, "SD59x18 lshift");
    }

    function testFuzz_Lt(int256 x, int256 y) external pure {
        vm.assume(x < y);
        assertTrue(lt(sd(x), sd(y)), "SD59x18 lt");
        assertTrue(sd(x) < sd(y), "SD59x18 <");
    }

    function testFuzz_Lte(int256 x, int256 y) external pure {
        vm.assume(x <= y);
        assertTrue(lte(sd(x), sd(y)), "SD59x18 lte");
        assertTrue(sd(x) <= sd(y), "SD59x18 <=");
    }

    function testFuzz_Mod(int256 x, int256 y) external pure {
        vm.assume(y != 0);
        SD59x18 expected = sd(x % y);
        assertEq(mod(sd(x), sd(y)), expected, "SD59x18 mod");
        assertEq(sd(x) % sd(y), expected, "SD59x18 %");
    }

    function testFuzz_Neq(int256 x, int256 y) external pure {
        vm.assume(x != y);
        assertTrue(neq(sd(x), sd(y)), "SD59x18 neq");
        assertTrue(sd(x) != sd(y), "SD59x18 !=");
    }

    function testFuzz_Not(int256 x) external pure {
        SD59x18 expected = sd(~x);
        assertEq(not(sd(x)), expected, "SD59x18 not");
        assertEq(~sd(x), expected, "SD59x18 ~");
    }

    function testFuzz_Or(int256 x, int256 y) external pure {
        SD59x18 expected = sd(x | y);
        assertEq(or(sd(x), sd(y)), expected, "SD59x18 or");
        assertEq(sd(x) | sd(y), expected, "SD59x18 |");
    }

    function testFuzz_Rshift(int256 x, uint256 y) external pure {
        _bound(y, 0, 512);
        SD59x18 expected = sd(x >> y);
        assertEq(rshift(sd(x), y), expected, "SD59x18 rshift");
    }

    function testFuzz_Sub(SD59x18 x, SD59x18 y) external pure {
        x = _bound(x, HALF_MIN_INT256, HALF_MAX_INT256);
        y = _bound(y, HALF_MIN_INT256, HALF_MAX_INT256);
        SD59x18 expected = sd(x.unwrap() - y.unwrap());
        assertEq(sub(x, y), expected, "SD59x18 sub");
        assertEq(x - y, expected, "SD59x18 -");
    }

    function testFuzz_Unary(int256 x) external pure {
        // Cannot take unary of MIN_INT256, because its absolute value would be 1 unit larger than MAX_INT256.
        x = _bound(x, MIN_INT256 + 1, MAX_INT256);
        SD59x18 expected = sd(-x);
        assertEq(unary(sd(x)), expected, "SD59x18 unary");
        assertEq(-sd(x), expected, "SD59x18 -");
    }

    function testFuzz_UncheckedAdd(int256 x, int256 y) external pure {
        unchecked {
            SD59x18 expected = sd(x + y);
            SD59x18 actual = uncheckedAdd(sd(x), sd(y));
            assertEq(actual, expected, "SD59x18 uncheckedAdd");
        }
    }

    function testFuzz_UncheckedSub(int256 x, int256 y) external pure {
        unchecked {
            SD59x18 expected = sd(x - y);
            SD59x18 actual = uncheckedSub(sd(x), sd(y));
            assertEq(actual, expected, "SD59x18 uncheckedSub");
        }
    }

    function testFuzz_Xor(int256 x, int256 y) external pure {
        SD59x18 expected = sd(x ^ y);
        assertEq(xor(sd(x), sd(y)), expected, "SD59x18 xor");
        assertEq(sd(x) ^ sd(y), expected, "SD59x18 ^");
    }
}
