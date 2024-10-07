// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Ceil_Overflow } from "src/sd59x18/Errors.sol";
import { ceil } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Ceil_Unit_Test is SD59x18_Unit_Test {
    function test_Ceil_Zero() external pure {
        SD59x18 x = ZERO;
        SD59x18 actual = ceil(x);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 ceil");
    }

    modifier whenNotZero() {
        _;
    }

    function negative_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, expected: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18, expected: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: -1e24, expected: -1e24 }));
        sets.push(set({ x: -4.2e18, expected: -4e18 }));
        sets.push(set({ x: NEGATIVE_PI, expected: -3e18 }));
        sets.push(set({ x: -2e18, expected: -2e18 }));
        sets.push(set({ x: -1.125e18, expected: -1e18 }));
        sets.push(set({ x: -1e18, expected: -1e18 }));
        sets.push(set({ x: -0.5e18, expected: 0 }));
        sets.push(set({ x: -0.1e18, expected: 0 }));
        return sets;
    }

    function test_Ceil_Negative() external parameterizedTest(negative_Sets()) whenNotZero {
        SD59x18 actual = ceil(s.x);
        assertEq(actual, s.expected, "SD59x18 ceil");
    }

    function test_RevertWhen_GtMaxPermitted() external whenNotZero {
        SD59x18 x = MAX_WHOLE_SD59x18 + sd(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Ceil_Overflow.selector, x));
        ceil(x);
    }

    modifier whenLteMaxPermitted() {
        _;
    }

    function positive_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.1e18, expected: 1e18 }));
        sets.push(set({ x: 0.5e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, expected: 1e18 }));
        sets.push(set({ x: 1.125e18, expected: 2e18 }));
        sets.push(set({ x: 2e18, expected: 2e18 }));
        sets.push(set({ x: PI, expected: 4e18 }));
        sets.push(set({ x: 4.2e18, expected: 5e18 }));
        sets.push(set({ x: 1e24, expected: 1e24 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: MAX_WHOLE_SD59x18 }));
        return sets;
    }

    function test_Ceil_Positive() external parameterizedTest(positive_Sets()) whenNotZero whenLteMaxPermitted {
        SD59x18 actual = ceil(s.x);
        assertEq(actual, s.expected, "SD59x18 ceil");
    }
}
