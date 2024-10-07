// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { frac } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Frac_Unit_Test is SD59x18_Unit_Test {
    function test_Frac_Zero() external pure {
        SD59x18 x = ZERO;
        SD59x18 actual = frac(x);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 frac");
    }

    modifier whenNotZero() {
        _;
    }

    function negative_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, expected: -0.792003956564819968e18 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18, expected: 0 }));
        sets.push(set({ x: -1e24, expected: 0 }));
        sets.push(set({ x: -4.2e18, expected: -0.2e18 }));
        sets.push(set({ x: NEGATIVE_PI, expected: -0.141592653589793238e18 }));
        sets.push(set({ x: -2e18, expected: 0 }));
        sets.push(set({ x: -1.125e18, expected: -0.125e18 }));
        sets.push(set({ x: -1e18, expected: 0 }));
        sets.push(set({ x: -0.5e18, expected: -0.5e18 }));
        sets.push(set({ x: -0.1e18, expected: -0.1e18 }));
        return sets;
    }

    function test_Frac_Negative() external parameterizedTest(negative_Sets()) whenNotZero {
        SD59x18 actual = frac(s.x);
        assertEq(actual, s.expected, "SD59x18 frac");
    }

    function positive_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.1e18, expected: 0.1e18 }));
        sets.push(set({ x: 0.5e18, expected: 0.5e18 }));
        sets.push(set({ x: 1e18, expected: 0 }));
        sets.push(set({ x: 1.125e18, expected: 0.125e18 }));
        sets.push(set({ x: 2e18, expected: 0 }));
        sets.push(set({ x: PI, expected: 0.141592653589793238e18 }));
        sets.push(set({ x: 4.2e18, expected: 0.2e18 }));
        sets.push(set({ x: 1e24, expected: 0 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: 0 }));
        sets.push(set({ x: MAX_SD59x18, expected: 0.792003956564819967e18 }));
        return sets;
    }

    function test_Frac() external parameterizedTest(positive_Sets()) whenNotZero {
        SD59x18 actual = frac(s.x);
        assertEq(actual, s.expected, "SD59x18 frac");
    }
}
