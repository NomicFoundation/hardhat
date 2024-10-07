// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { stdError } from "forge-std/src/StdError.sol";

import { MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { inv } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Inv_Unit_Test is SD59x18_Unit_Test {
    function test_RevertWhen_Zero() external {
        SD59x18 x = ZERO;
        vm.expectRevert(stdError.divisionError);
        inv(x);
    }

    modifier whenNotZero() {
        _;
    }

    function negative_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, expected: 0 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18, expected: 0 }));
        sets.push(set({ x: -1e36 - 1, expected: 0 }));
        sets.push(set({ x: -1e36, expected: -1 }));
        sets.push(set({ x: -2503e18, expected: -0.000399520575309628e18 }));
        sets.push(set({ x: -772.05e18, expected: -0.001295252898128359e18 }));
        sets.push(set({ x: -100.135e18, expected: -0.00998651820042942e18 }));
        sets.push(set({ x: -22e18, expected: -0.045454545454545454e18 }));
        sets.push(set({ x: -4e18, expected: -0.25e18 }));
        sets.push(set({ x: NEGATIVE_PI, expected: -0.318309886183790671e18 }));
        sets.push(set({ x: -2e18, expected: -0.5e18 }));
        sets.push(set({ x: -1e18, expected: -1e18 }));
        sets.push(set({ x: -0.1e18, expected: -10e18 }));
        sets.push(set({ x: -0.05e18, expected: -20e18 }));
        sets.push(set({ x: -0.00001e18, expected: -100_000e18 }));
        sets.push(set({ x: -1, expected: -1e36 }));
        return sets;
    }

    function test_Inv_Negative() external parameterizedTest(negative_Sets()) whenNotZero {
        SD59x18 actual = inv(s.x);
        assertEq(actual, s.expected, "SD59x18 inv");
    }

    function positive_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, expected: 1e36 }));
        sets.push(set({ x: 0.00001e18, expected: 100_000e18 }));
        sets.push(set({ x: 0.05e18, expected: 20e18 }));
        sets.push(set({ x: 0.1e18, expected: 10e18 }));
        sets.push(set({ x: 1e18, expected: 1e18 }));
        sets.push(set({ x: 2e18, expected: 0.5e18 }));
        sets.push(set({ x: PI, expected: 0.318309886183790671e18 }));
        sets.push(set({ x: 4e18, expected: 0.25e18 }));
        sets.push(set({ x: 22e18, expected: 0.045454545454545454e18 }));
        sets.push(set({ x: 100.135e18, expected: 0.00998651820042942e18 }));
        sets.push(set({ x: 772.05e18, expected: 0.001295252898128359e18 }));
        sets.push(set({ x: 2503e18, expected: 0.000399520575309628e18 }));
        sets.push(set({ x: 1e36, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 1e36 + 1, expected: 0 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: 0 }));
        sets.push(set({ x: MAX_SD59x18, expected: 0 }));
        return sets;
    }

    function test_Inv_Positive() external parameterizedTest(positive_Sets()) whenNotZero {
        SD59x18 actual = inv(s.x);
        assertEq(actual, s.expected, "SD59x18 inv");
    }
}
