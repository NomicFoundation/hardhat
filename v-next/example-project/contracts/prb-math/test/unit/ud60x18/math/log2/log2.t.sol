// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { ud } from "src/ud60x18/Casting.sol";
import { E, PI, MAX_UD60x18, MAX_WHOLE_UD60x18, UNIT } from "src/ud60x18/Constants.sol";
import { PRBMath_UD60x18_Log_InputTooSmall } from "src/ud60x18/Errors.sol";
import { log2 } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Log2_Unit_Test is UD60x18_Unit_Test {
    function test_RevertWhen_LtUnit() external {
        UD60x18 x = UNIT - ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_Log_InputTooSmall.selector, x));
        log2(x);
    }

    modifier whenGteUnit() {
        _;
    }

    function powerOfTwo_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 1e18, expected: 0 }));
        sets.push(set({ x: 2e18, expected: 1e18 }));
        sets.push(set({ x: 4e18, expected: 2e18 }));
        sets.push(set({ x: 8e18, expected: 3e18 }));
        sets.push(set({ x: 16e18, expected: 4e18 }));
        sets.push(set({ x: 2 ** 195 * 1e18, expected: 195e18 }));
        return sets;
    }

    function test_Log2_PowerOfTwo() external parameterizedTest(powerOfTwo_Sets()) whenGteUnit {
        UD60x18 actual = log2(s.x);
        assertEq(actual, s.expected, "UD60x18 log2");
    }

    function notPowerOfTwo_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 1.125e18, expected: 0.169925001442312346e18 }));
        sets.push(set({ x: E, expected: 1_442695040888963394 }));
        sets.push(set({ x: PI, expected: 1_651496129472318782 }));
        sets.push(set({ x: 1e24, expected: 19_931568569324174075 }));
        sets.push(set({ x: MAX_WHOLE_UD60x18, expected: 196_205294292027477728 }));
        sets.push(set({ x: MAX_UD60x18, expected: 196_205294292027477728 }));
        return sets;
    }

    function test_Log2_NotPowerOfTwo() external parameterizedTest(notPowerOfTwo_Sets()) whenGteUnit {
        UD60x18 actual = log2(s.x);
        assertEq(actual, s.expected, "UD60x18 log2");
    }
}
