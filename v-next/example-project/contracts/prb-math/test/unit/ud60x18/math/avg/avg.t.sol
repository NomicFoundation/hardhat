// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { MAX_UD60x18, MAX_WHOLE_UD60x18, ZERO } from "src/ud60x18/Constants.sol";
import { avg } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Avg_Unit_Test is UD60x18_Unit_Test {
    function test_Avg_BothOperandsZero() external pure {
        UD60x18 x = ZERO;
        UD60x18 y = ZERO;
        UD60x18 actual = avg(x, y);
        UD60x18 expected = ZERO;
        assertEq(actual, expected, "UD60x18 avg");
    }

    function onlyOneOperandZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0, y: 3e18, expected: 1.5e18 }));
        sets.push(set({ x: 3e18, y: 0, expected: 1.5e18 }));
        return sets;
    }

    function test_Avg_OnlyOneOperandZero() external parameterizedTest(onlyOneOperandZero_Sets()) {
        UD60x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "UD60x18 avg");
    }

    modifier whenNeitherOperandZero() {
        _;
    }

    function bothOperandsEven_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 2, y: 4, expected: 3 }));
        sets.push(set({ x: 2e18, y: 2e18, expected: 2e18 }));
        sets.push(set({ x: 4e18, y: 8e18, expected: 6e18 }));
        sets.push(set({ x: 100e18, y: 200e18, expected: 150e18 }));
        sets.push(set({ x: 1e24, y: 1e25, expected: 5.5e24 }));
        return sets;
    }

    function test_Avg_NeitherOperandZero_BothOperandsEven()
        external
        parameterizedTest(bothOperandsEven_Sets())
        whenNeitherOperandZero
    {
        UD60x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "UD60x18 avg");
    }

    function bothOperandsOdd_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 1, y: 3, expected: 2 }));
        sets.push(set({ x: 1e18 + 1, y: 1e18 + 1, expected: 1e18 + 1 }));
        sets.push(set({ x: 3e18 + 1, y: 7e18 + 1, expected: 5e18 + 1 }));
        sets.push(set({ x: 99e18 + 1, y: 199e18 + 1, expected: 149e18 + 1 }));
        sets.push(set({ x: 1e24 + 1, y: 1e25 + 1, expected: 5.5e24 + 1 }));
        sets.push(set({ x: MAX_UD60x18, y: MAX_UD60x18, expected: MAX_UD60x18 }));
        return sets;
    }

    function test_Avg_NeitherOperandZero_BothOperandsOdd()
        external
        parameterizedTest(bothOperandsOdd_Sets())
        whenNeitherOperandZero
    {
        UD60x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "UD60x18 avg");
    }

    function oneOperandEvenTheOtherOdd_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 1, y: 2, expected: 1 }));
        sets.push(set({ x: 1e18 + 1, y: 2e18, expected: 1.5e18 }));
        sets.push(set({ x: 3e18 + 1, y: 8e18, expected: 5.5e18 }));
        sets.push(set({ x: 99e18, y: 200e18, expected: 149.5e18 }));
        sets.push(set({ x: 1e24 + 1, y: 1e25 + 1e18, expected: 5.5e24 + 0.5e18 }));
        sets.push(
            set({
                x: MAX_UD60x18,
                y: MAX_WHOLE_UD60x18,
                expected: 115792089237316195423570985008687907853269984665640564039457_292003956564819967
            })
        );
        return sets;
    }

    function test_Avg_NeitherOperandZero_OneOperandEvenTheOtherOdd()
        external
        parameterizedTest(oneOperandEvenTheOtherOdd_Sets())
        whenNeitherOperandZero
    {
        UD60x18 actual = avg(s.x, s.y);
        assertEq(actual, s.expected, "UD60x18 avg");
    }
}
