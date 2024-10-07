// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Floor_Underflow } from "src/sd59x18/Errors.sol";
import { floor } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Floor_Unit_Test is SD59x18_Unit_Test {
    function test_Floor_Zero() external pure {
        SD59x18 x = ZERO;
        SD59x18 actual = floor(x);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 floor");
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_Negative_LtMinPermitted() external whenNotZero {
        SD59x18 x = MIN_WHOLE_SD59x18 - sd(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Floor_Underflow.selector, x));
        floor(x);
    }

    function negativeAndGteMinPermitted_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_WHOLE_SD59x18, expected: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: -1e24, expected: -1e24 }));
        sets.push(set({ x: -4.2e18, expected: -5e18 }));
        sets.push(set({ x: -2e18, expected: -2e18 }));
        sets.push(set({ x: -1.125e18, expected: -2e18 }));
        sets.push(set({ x: -1e18, expected: -1e18 }));
        sets.push(set({ x: -0.5e18, expected: -1e18 }));
        sets.push(set({ x: -0.1e18, expected: -1e18 }));
        return sets;
    }

    function test_Floor_Negative_GteMinPermitted() external parameterizedTest(negativeAndGteMinPermitted_Sets()) whenNotZero {
        SD59x18 actual = floor(s.x);
        assertEq(actual, s.expected, "SD59x18 floor");
    }

    function positive_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.1e18, expected: 0 }));
        sets.push(set({ x: 0.5e18, expected: 0 }));
        sets.push(set({ x: 1e18, expected: 1e18 }));
        sets.push(set({ x: 1.125e18, expected: 1e18 }));
        sets.push(set({ x: 2e18, expected: 2e18 }));
        sets.push(set({ x: PI, expected: 3e18 }));
        sets.push(set({ x: 4.2e18, expected: 4e18 }));
        sets.push(set({ x: 1e24, expected: 1e24 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: MAX_WHOLE_SD59x18 }));
        sets.push(set({ x: MAX_SD59x18, expected: MAX_WHOLE_SD59x18 }));
        return sets;
    }

    function test_Floor_Positive() external parameterizedTest(positive_Sets()) whenNotZero {
        SD59x18 actual = floor(s.x);
        assertEq(actual, s.expected, "SD59x18 floor");
    }
}
