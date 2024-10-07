// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, ZERO } from "src/sd59x18/Constants.sol";
import { avg } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Avg_Unit_Test is SD59x18_Unit_Test {
    function test_Avg_BothOperandsZero() external pure {
        SD59x18 x = ZERO;
        SD59x18 y = ZERO;
        SD59x18 actual = avg(x, y);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 avg");
    }

    function onlyOneOperandZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: -3e18, y: 0, expected: -1.5e18 }));
        sets.push(set({ x: 0, y: -3e18, expected: -1.5e18 }));
        sets.push(set({ x: 0, y: 3e18, expected: 1.5e18 }));
        sets.push(set({ x: 3e18, y: 0, expected: 1.5e18 }));
        return sets;
    }

    function test_Avg_OnlyOneOperandZero() external parameterizedTest(onlyOneOperandZero_Sets()) {
        SD59x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }

    modifier whenNeitherOperandZero() {
        _;
    }

    function oneOperandNegativeTheOtherPositive_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, y: MAX_SD59x18, expected: 0 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18, y: MAX_WHOLE_SD59x18, expected: 0 }));
        sets.push(set({ x: -4e18, y: -2e18, expected: -3e18 }));
        sets.push(set({ x: -2e18, y: -2e18, expected: -2e18 }));
        sets.push(set({ x: -0.000000000000000002e18, y: 0.000000000000000004e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: 0.000000000000000003e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: 0.000000000000000002e18, expected: 0 }));
        return sets;
    }

    function test_Avg_OneOperandNegativeTheOtherPositive()
        external
        parameterizedTest(oneOperandNegativeTheOtherPositive_Sets())
        whenNeitherOperandZero
    {
        SD59x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }

    function bothOperandsNegative_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(
            set({
                x: MIN_WHOLE_SD59x18,
                y: MIN_SD59x18,
                expected: -57896044618658097711785492504343953926634992332820282019728_396001978282409984
            })
        );
        sets.push(set({ x: -4e18, y: -2e18, expected: -3e18 }));
        sets.push(set({ x: -2e18, y: -2e18, expected: -2e18 }));
        sets.push(set({ x: -0.000000000000000002e18, y: -0.000000000000000004e18, expected: -0.000000000000000003e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: -0.000000000000000003e18, expected: -0.000000000000000002e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: -0.000000000000000002e18, expected: -0.000000000000000001e18 }));
        return sets;
    }

    function test_Avg_BothOperandsNegative() external parameterizedTest(bothOperandsNegative_Sets()) whenNeitherOperandZero {
        SD59x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }

    modifier whenBothOperandsPositive() {
        _;
    }

    function bothOperandsEven_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000002e18, y: 0.000000000000000004e18, expected: 0.000000000000000003e18 }));
        sets.push(set({ x: 2e18, y: 2e18, expected: 2e18 }));
        sets.push(set({ x: 4e18, y: 8e18, expected: 6e18 }));
        sets.push(set({ x: 100e18, y: 200e18, expected: 150e18 }));
        sets.push(set({ x: 1e24, y: 1e25, expected: 5.5e24 }));
        return sets;
    }

    function test_Avg_BothOperandsEven()
        external
        parameterizedTest(bothOperandsEven_Sets())
        whenNeitherOperandZero
        whenBothOperandsPositive
    {
        SD59x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }

    function bothOperandsOdd_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: 0.000000000000000003e18, expected: 0.000000000000000002e18 }));
        sets.push(set({ x: 1e18 + 1, y: 1e18 + 1, expected: 1e18 + 1 }));
        sets.push(set({ x: 3e18 + 1, y: 7e18 + 1, expected: 5e18 + 1 }));
        sets.push(set({ x: 99e18 + 1, y: 199e18 + 1, expected: 149e18 + 1 }));
        sets.push(set({ x: 1e24 + 1, y: 1e25 + 1, expected: 5.5e24 + 1 }));
        sets.push(set({ x: MAX_SD59x18, y: MAX_SD59x18, expected: MAX_SD59x18 }));
        return sets;
    }

    function test_Avg_BothOperandsOdd() external parameterizedTest(bothOperandsOdd_Sets()) {
        SD59x18 actual = avg(s.x, s.y);
        logSd(s.x);
        logSd(s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }

    function oneOperandEvenTheOtherOdd_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: 0.000000000000000002e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 1e18 + 1, y: 2e18, expected: 1.5e18 }));
        sets.push(set({ x: 3e18 + 1, y: 8e18, expected: 5.5e18 }));
        sets.push(set({ x: 99e18, y: 200e18, expected: 149.5e18 }));
        sets.push(set({ x: 1e24 + 1, y: 1e25 + 1e18, expected: 5.5e24 + 0.5e18 }));
        sets.push(
            set({
                x: MAX_SD59x18,
                y: MAX_WHOLE_SD59x18,
                expected: 57896044618658097711785492504343953926634992332820282019728_396001978282409983
            })
        );
        return sets;
    }

    function test_Avg_OneOperandEvenTheOtherOdd() external parameterizedTest(oneOperandEvenTheOtherOdd_Sets()) {
        SD59x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 avg");
    }
}
