// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { PRBMath_MulDiv18_Overflow } from "src/Common.sol";
import { E, MAX_UD60x18, MAX_WHOLE_UD60x18, PI } from "src/ud60x18/Constants.sol";
import { mul } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Mul_Unit_Test is UD60x18_Unit_Test {
    function oneOperandZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0, y: MAX_UD60x18, expected: 0 }));
        sets.push(set({ x: MAX_UD60x18, y: 0, expected: 0 }));
        return sets;
    }

    function test_Mul_OneOperandZero() external parameterizedTest(oneOperandZero_Sets()) {
        assertEq(mul(s.x, s.y), s.expected, "UD60x18 mul");
        assertEq(s.x * s.y, s.expected, "UD60x18 *");
    }

    modifier whenNeitherOperandZero() {
        _;
    }

    function test_RevertWhen_ResultOverflowUD60x18_Function() external whenNeitherOperandZero {
        UD60x18 x = SQRT_MAX_UD60x18 + ud(1);
        UD60x18 y = SQRT_MAX_UD60x18 + ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_MulDiv18_Overflow.selector, x.unwrap(), y.unwrap()));
        mul(x, y);
    }

    function test_RevertWhen_ResultOverflowUD60x18_Operator() external whenNeitherOperandZero {
        UD60x18 x = SQRT_MAX_UD60x18 + ud(1);
        UD60x18 y = SQRT_MAX_UD60x18 + ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_MulDiv18_Overflow.selector, x.unwrap(), y.unwrap()));
        x * y;
    }

    modifier whenResultDoesNotOverflowUD60x18() {
        _;
    }

    function mul_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: 0.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0.000000000000000006e18, y: 0.1e18, expected: 0 }));
        sets.push(set({ x: 0.000000001e18, y: 0.000000001e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 0.00001e18, y: 0.00001e18, expected: 0.0000000001e18 }));
        sets.push(set({ x: 0.001e18, y: 0.01e18, expected: 0.00001e18 }));
        sets.push(set({ x: 0.01e18, y: 0.05e18, expected: 0.0005e18 }));
        sets.push(set({ x: 1e18, y: 1e18, expected: 1e18 }));
        sets.push(set({ x: 2.098e18, y: 1.119e18, expected: 2.347662e18 }));
        sets.push(set({ x: PI, y: E, expected: 8_539734222673567063 }));
        sets.push(set({ x: 18.3e18, y: 12.04e18, expected: 220.332e18 }));
        sets.push(set({ x: 314.271e18, y: 188.19e18, expected: 59_142.65949e18 }));
        sets.push(set({ x: 9_817e18, y: 2_348e18, expected: 23_050_316e18 }));
        sets.push(set({ x: 12_983.989e18, y: 782.99e18, expected: 1_016_6333.54711e18 }));
        sets.push(set({ x: 1e24, y: 1e20, expected: 1e26 }));
        sets.push(
            set({
                x: SQRT_MAX_UD60x18,
                y: SQRT_MAX_UD60x18,
                expected: 115792089237316195423570985008687907853269984664959999305615_707080986380425072
            })
        );
        sets.push(set({ x: MAX_WHOLE_UD60x18, y: 0.000000000000000001e18, expected: MAX_SCALED_UD60x18 }));
        sets.push(set({ x: MAX_UD60x18 - ud(0.5e18), y: 0.000000000000000001e18, expected: MAX_SCALED_UD60x18 }));
        return sets;
    }

    function test_Mul() external parameterizedTest(mul_Sets()) whenNeitherOperandZero whenResultDoesNotOverflowUD60x18 {
        assertEq(mul(s.x, s.y), s.expected, "UD60x18 mul");
        assertEq(s.x * s.y, s.expected, "UD60x18 *");
    }
}
