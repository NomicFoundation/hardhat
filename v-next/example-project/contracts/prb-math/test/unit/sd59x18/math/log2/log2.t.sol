// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { E, MAX_SD59x18, MAX_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Log_InputTooSmall } from "src/sd59x18/Errors.sol";
import { log2 } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Log2_Unit_Test is SD59x18_Unit_Test {
    function test_RevertWhen_Zero() external {
        SD59x18 x = ZERO;
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Log_InputTooSmall.selector, x));
        log2(x);
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_Negative() external whenNotZero {
        SD59x18 x = sd(-1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Log_InputTooSmall.selector, x));
        log2(x);
    }

    modifier whenPositive() {
        _;
    }

    function powerOfTwo_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.0625e18, expected: -4e18 }));
        sets.push(set({ x: 0.125e18, expected: -3e18 }));
        sets.push(set({ x: 0.25e18, expected: -2e18 }));
        sets.push(set({ x: 0.5e18, expected: -1e18 }));
        sets.push(set({ x: 1e18, expected: 0 }));
        sets.push(set({ x: 2e18, expected: 1e18 }));
        sets.push(set({ x: 4e18, expected: 2e18 }));
        sets.push(set({ x: 8e18, expected: 3e18 }));
        sets.push(set({ x: 16e18, expected: 4e18 }));
        sets.push(set({ x: 2 ** 195 * 1e18, expected: 195e18 }));
        return sets;
    }

    function test_Log2_PowerOfTwo() external parameterizedTest(powerOfTwo_Sets()) whenNotZero whenPositive {
        SD59x18 actual = log2(s.x);
        assertEq(actual, s.expected, "SD59x18 log2");
    }

    function notPowerOfTwo_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.0091e18, expected: -6_779917739350753112 }));
        sets.push(set({ x: 0.083e18, expected: -3_590744853315162277 }));
        sets.push(set({ x: 0.1e18, expected: -3_321928094887362334 }));
        sets.push(set({ x: 0.2e18, expected: -2_321928094887362334 }));
        sets.push(set({ x: 0.3e18, expected: -1_736965594166206154 }));
        sets.push(set({ x: 0.4e18, expected: -1_321928094887362334 }));
        sets.push(set({ x: 0.6e18, expected: -0.736965594166206154e18 }));
        sets.push(set({ x: 0.7e18, expected: -0.514573172829758229e18 }));
        sets.push(set({ x: 0.8e18, expected: -0.321928094887362334e18 }));
        sets.push(set({ x: 0.9e18, expected: -0.152003093445049973e18 }));
        sets.push(set({ x: 1.125e18, expected: 0.169925001442312346e18 }));
        sets.push(set({ x: E, expected: 1_442695040888963394 }));
        sets.push(set({ x: PI, expected: 1_651496129472318782 }));
        sets.push(set({ x: 1e24, expected: 19_931568569324174075 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: 195_205294292027477728 }));
        sets.push(set({ x: MAX_SD59x18, expected: 195_205294292027477728 }));
        return sets;
    }

    function test_Log2_NotPowerOfTwo() external parameterizedTest(notPowerOfTwo_Sets()) whenNotZero whenPositive {
        SD59x18 actual = log2(s.x);
        assertEq(actual, s.expected, "SD59x18 log2");
    }
}
