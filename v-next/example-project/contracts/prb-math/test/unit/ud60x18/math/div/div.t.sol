// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { stdError } from "forge-std/src/StdError.sol";

import { MAX_UD60x18, MAX_WHOLE_UD60x18, PI, uUNIT, ZERO } from "src/ud60x18/Constants.sol";
import { div } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";
import { PRBMath_MulDiv_Overflow } from "src/Common.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Div_Unit_Test is UD60x18_Unit_Test {
    function test_RevertWhen_DenominatorZero_Function() external {
        UD60x18 x = ud(1e18);
        UD60x18 y = ZERO;
        vm.expectRevert(stdError.divisionError);
        div(x, y);
    }

    function test_RevertWhen_DenominatorZero_Operator() external {
        UD60x18 x = ud(1e18);
        UD60x18 y = ZERO;
        vm.expectRevert(stdError.divisionError);
        x / y;
    }

    modifier whenDenominatorNotZero() {
        _;
    }

    function numeratorZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0, y: 0.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0, y: 1e18, expected: 0 }));
        sets.push(set({ x: 0, y: PI, expected: 0 }));
        sets.push(set({ x: 0, y: 1e24, expected: 0 }));
        return sets;
    }

    function test_Div_NumeratorZero() external parameterizedTest(numeratorZero_Sets()) whenDenominatorNotZero {
        assertEq(div(s.x, s.y), s.expected, "UD60x18 div");
        assertEq(s.x / s.y, s.expected, "UD60x18 /");
    }

    function test_RevertWhen_ResultOverflowUD60x18_Function() external whenDenominatorNotZero {
        UD60x18 x = MAX_SCALED_UD60x18 + ud(1);
        UD60x18 y = ud(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_MulDiv_Overflow.selector, x.unwrap(), uUNIT, y.unwrap()));
        div(x, y);
    }

    function test_RevertWhen_ResultOverflowUD60x18_Operator() external whenDenominatorNotZero {
        UD60x18 x = MAX_SCALED_UD60x18 + ud(1);
        UD60x18 y = ud(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_MulDiv_Overflow.selector, x.unwrap(), uUNIT, y.unwrap()));
        x / y;
    }

    modifier whenResultDoesNotOverflowUD60x18() {
        _;
    }

    function div_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: MAX_UD60x18, expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: 1.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: 1e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: 1e13, y: 1e13, expected: 1e18 }));
        sets.push(set({ x: 1e13, y: 0.00002e18, expected: 0.5e18 }));
        sets.push(set({ x: 0.05e18, y: 0.02e18, expected: 2.5e18 }));
        sets.push(set({ x: 0.1e18, y: 0.01e18, expected: 10e18 }));
        sets.push(set({ x: 2e18, y: 2e18, expected: 1e18 }));
        sets.push(set({ x: 2e18, y: 5e18, expected: 0.4e18 }));
        sets.push(set({ x: 4e18, y: 2e18, expected: 2e18 }));
        sets.push(set({ x: 22e18, y: 7e18, expected: 3_142857142857142857 }));
        sets.push(set({ x: 100.135e18, y: 100.134e18, expected: 1_000009986617931971 }));
        sets.push(set({ x: 772.05e18, y: 199.98e18, expected: 3_860636063606360636 }));
        sets.push(set({ x: 2503e18, y: 918882.11e18, expected: 0.002723962054283546e18 }));
        sets.push(set({ x: 1e24, y: 1e18, expected: 1e24 }));
        sets.push(set({ x: MAX_SCALED_UD60x18, y: 0.000000000000000001e18, expected: MAX_WHOLE_UD60x18 }));
        return sets;
    }

    function test_Div() external parameterizedTest(div_Sets()) whenDenominatorNotZero whenResultDoesNotOverflowUD60x18 {
        assertEq(div(s.x, s.y), s.expected, "UD60x18 div");
        assertEq(s.x / s.y, s.expected, "UD60x18 /");
    }
}
