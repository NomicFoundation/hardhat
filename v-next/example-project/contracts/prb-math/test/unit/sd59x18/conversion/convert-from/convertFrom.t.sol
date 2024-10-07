// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { E, MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI } from "src/sd59x18/Constants.sol";
import { convert } from "src/sd59x18/Conversions.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract ConvertFrom_Unit_Test is SD59x18_Unit_Test {
    function ltAbsoluteUnit_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: -1e18 + 1 }));
        sets.push(set({ x: -1 }));
        sets.push(set({ x: 0 }));
        sets.push(set({ x: 1 }));
        sets.push(set({ x: 1e18 - 1 }));
        return sets;
    }

    function test_ConvertFrom_LtAbsoluteUnit() external parameterizedTest(ltAbsoluteUnit_Sets()) {
        int256 actual = convert(s.x);
        int256 expected = 0;
        assertEq(actual, expected, "SD59x18 convertFrom");
    }

    modifier whenGteAbsoluteUnit() {
        _;
    }

    function gteAbsoluteUnit_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, expected: MIN_SCALED_SD59x18 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18, expected: MIN_SCALED_SD59x18 }));
        sets.push(set({ x: -4.2e45, expected: -4.2e27 }));
        sets.push(set({ x: -1729e18, expected: -0.000000000000001729e18 }));
        sets.push(set({ x: NEGATIVE_PI, expected: -0.000000000000000003e18 }));
        sets.push(set({ x: NEGATIVE_E, expected: -0.000000000000000002e18 }));
        sets.push(set({ x: -2e18 - 1, expected: -0.000000000000000002e18 }));
        sets.push(set({ x: -2e18, expected: -0.000000000000000002e18 }));
        sets.push(set({ x: -2e18 + 1, expected: -0.000000000000000001e18 }));
        sets.push(set({ x: -1e18, expected: -0.000000000000000001e18 }));
        sets.push(set({ x: 1e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 1e18 + 1, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 2e18 - 1, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 2e18, expected: 0.000000000000000002e18 }));
        sets.push(set({ x: 2e18 + 1, expected: 0.000000000000000002e18 }));
        sets.push(set({ x: E, expected: 0.000000000000000002e18 }));
        sets.push(set({ x: PI, expected: 0.000000000000000003e18 }));
        sets.push(set({ x: 1729e18, expected: 0.000000000000001729e18 }));
        sets.push(set({ x: 4.2e45, expected: 4.2e27 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: MAX_SCALED_SD59x18 }));
        sets.push(set({ x: MAX_SD59x18, expected: MAX_SCALED_SD59x18 }));
        return sets;
    }

    function test_ConvertFrom() external parameterizedTest(gteAbsoluteUnit_Sets()) whenGteAbsoluteUnit {
        int256 actual = convert(s.x);
        int256 expected = s.expected.unwrap();
        assertEq(actual, expected, "SD59x18 convertFrom");
    }
}
