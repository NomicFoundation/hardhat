// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { stdError } from "forge-std/src/StdError.sol";

import { sd } from "src/sd59x18/Casting.sol";
import { MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Div_InputTooSmall, PRBMath_SD59x18_Div_Overflow } from "src/sd59x18/Errors.sol";
import { div } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Div_Unit_Test is SD59x18_Unit_Test {
    function test_RevertWhen_DenominatorZero_Function() external {
        SD59x18 x = sd(1e18);
        SD59x18 y = ZERO;
        vm.expectRevert(stdError.divisionError);
        div(x, y);
    }

    function test_RevertWhen_DenominatorZero_Operator() external {
        SD59x18 x = sd(1e18);
        SD59x18 y = ZERO;
        vm.expectRevert(stdError.divisionError);
        x / y;
    }

    modifier whenDenominatorNotZero() {
        _;
    }

    function test_RevertWhen_DenominatorMinSD59x18_Function() external whenDenominatorNotZero {
        SD59x18 x = sd(1e18);
        SD59x18 y = MIN_SD59x18;
        vm.expectRevert(PRBMath_SD59x18_Div_InputTooSmall.selector);
        div(x, y);
    }

    function test_RevertWhen_DenominatorMinSD59x18_Operator() external whenDenominatorNotZero {
        SD59x18 x = sd(1e18);
        SD59x18 y = MIN_SD59x18;
        vm.expectRevert(PRBMath_SD59x18_Div_InputTooSmall.selector);
        x / y;
    }

    modifier whenDenominatorNotMinSD59x18() {
        _;
    }

    function numeratorZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0, y: NEGATIVE_PI, expected: 0 }));
        sets.push(set({ x: 0, y: -1e24, expected: 0 }));
        sets.push(set({ x: 0, y: -1e18, expected: 0 }));
        sets.push(set({ x: 0, y: -0.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0, y: 0.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0, y: 1e18, expected: 0 }));
        sets.push(set({ x: 0, y: PI, expected: 0 }));
        sets.push(set({ x: 0, y: 1e24, expected: 0 }));
        return sets;
    }

    function test_Div_NumeratorZero()
        external
        parameterizedTest(numeratorZero_Sets())
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
    {
        assertEq(div(s.x, s.y), s.expected, "SD59x18 div");
        assertEq(s.x / s.y, s.expected, "SD59x18 /");
    }

    modifier whenNumeratorNotZero() {
        _;
    }

    function test_RevertWhen_NumeratorMinSD59x18_Function()
        external
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
    {
        SD59x18 x = MIN_SD59x18;
        SD59x18 y = sd(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Div_InputTooSmall.selector));
        div(x, y);
    }

    function test_RevertWhen_NumeratorMinSD59x18_Operator()
        external
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
    {
        SD59x18 x = MIN_SD59x18;
        SD59x18 y = sd(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Div_InputTooSmall.selector));
        x / y;
    }

    modifier whenNumeratorNotMinSD59x18() {
        _;
    }

    function test_RevertWhen_ResultOverflowSD59x18_Function()
        external
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
        whenNumeratorNotMinSD59x18
    {
        SD59x18 x = MIN_SCALED_SD59x18 - sd(1);
        SD59x18 y = sd(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Div_Overflow.selector, x, y));
        div(x, y);
    }

    function test_RevertWhen_ResultOverflowSD59x18_Operator()
        external
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
        whenNumeratorNotMinSD59x18
    {
        SD59x18 x = MIN_SCALED_SD59x18 - sd(1);
        SD59x18 y = sd(0.000000000000000001e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Div_Overflow.selector, x, y));
        x / y;
    }

    modifier whenResultDoesNotOverflowSD59x18() {
        _;
    }

    function numeratorDenominatorSameSign_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SCALED_SD59x18, y: -0.000000000000000001e18, expected: MAX_WHOLE_SD59x18 }));
        sets.push(set({ x: -1e24, y: -1e18, expected: 1e24 }));
        sets.push(set({ x: -2503e18, y: -918882.11e18, expected: 0.002723962054283546e18 }));
        sets.push(set({ x: -772.05e18, y: -199.98e18, expected: 3_860636063606360636 }));
        sets.push(set({ x: -100.135e18, y: -100.134e18, expected: 1_000009986617931971 }));
        sets.push(set({ x: -22e18, y: -7e18, expected: 3_142857142857142857 }));
        sets.push(set({ x: -4e18, y: -2e18, expected: 2e18 }));
        sets.push(set({ x: -2e18, y: -5e18, expected: 0.4e18 }));
        sets.push(set({ x: -2e18, y: -2e18, expected: 1e18 }));
        sets.push(set({ x: -0.1e18, y: -0.01e18, expected: 1e19 }));
        sets.push(set({ x: -0.05e18, y: -0.02e18, expected: 2.5e18 }));
        sets.push(set({ x: -1e13, y: -0.00002e18, expected: 0.5e18 }));
        sets.push(set({ x: -1e13, y: -1e13, expected: 1e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: -1e18, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: -1.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: -0.000000000000000001e18, y: MIN_SD59x18 + sd(1), expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: MAX_SD59x18, expected: 0 }));
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
        sets.push(set({ x: MAX_SCALED_SD59x18, y: 0.000000000000000001e18, expected: MAX_WHOLE_SD59x18 }));
        return sets;
    }

    function test_Div_NumeratorDenominatorSameSign()
        external
        parameterizedTest(numeratorDenominatorSameSign_Sets())
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
        whenNumeratorNotMinSD59x18
        whenResultDoesNotOverflowSD59x18
    {
        assertEq(div(s.x, s.y), s.expected, "SD59x18 div");
        assertEq(s.x / s.y, s.expected, "SD59x18 /");
    }

    function numeratorDenominatorDifferentSign_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SCALED_SD59x18, y: 0.000000000000000001e18, expected: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: -1e24, y: 1e18, expected: -1e24 }));
        sets.push(set({ x: -2503e18, y: 918882.11e18, expected: -0.002723962054283546e18 }));
        sets.push(set({ x: -772.05e18, y: 199.98e18, expected: -3_860636063606360636 }));
        sets.push(set({ x: -100.135e18, y: 100.134e18, expected: -1_000009986617931971 }));
        sets.push(set({ x: -22e18, y: 7e18, expected: -3_142857142857142857 }));
        sets.push(set({ x: -4e18, y: 2e18, expected: -2e18 }));
        sets.push(set({ x: -2e18, y: 5e18, expected: -0.4e18 }));
        sets.push(set({ x: -2e18, y: 2e18, expected: -1e18 }));
        sets.push(set({ x: -0.1e18, y: 0.01e18, expected: -1e19 }));
        sets.push(set({ x: -0.05e18, y: 0.02e18, expected: -2.5e18 }));
        sets.push(set({ x: -1e13, y: 2e13, expected: -0.5e18 }));
        sets.push(set({ x: -1e13, y: 1e13, expected: -1e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: 1e18, expected: -0.000000000000000001e18 }));
        sets.push(set({ x: -0.000000000000000001e18, y: 1.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: -0.000000000000000001e18, y: MAX_SD59x18, expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: MIN_SD59x18 + sd(1), expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: -1.000000000000000001e18, expected: 0 }));
        sets.push(set({ x: 0.000000000000000001e18, y: -1e18, expected: -0.000000000000000001e18 }));
        sets.push(set({ x: 1e13, y: -1e13, expected: -1e18 }));
        sets.push(set({ x: 1e13, y: -2e13, expected: -0.5e18 }));
        sets.push(set({ x: 0.05e18, y: -0.02e18, expected: -2.5e18 }));
        sets.push(set({ x: 0.1e18, y: -0.01e18, expected: -10e18 }));
        sets.push(set({ x: 2e18, y: -2e18, expected: -1e18 }));
        sets.push(set({ x: 2e18, y: -5e18, expected: -0.4e18 }));
        sets.push(set({ x: 4e18, y: -2e18, expected: -2e18 }));
        sets.push(set({ x: 22e18, y: -7e18, expected: -3_142857142857142857 }));
        sets.push(set({ x: 100.135e18, y: -100.134e18, expected: -1_000009986617931971 }));
        sets.push(set({ x: 772.05e18, y: -199.98e18, expected: -3_860636063606360636 }));
        sets.push(set({ x: 2503e18, y: -918882.11e18, expected: -0.002723962054283546e18 }));
        sets.push(set({ x: 1e24, y: -1e18, expected: -1e24 }));
        sets.push(set({ x: MAX_SCALED_SD59x18, y: 0.000000000000000001e18, expected: MAX_WHOLE_SD59x18 }));
        return sets;
    }

    function test_Div_NumeratorDenominatorDifferentSign()
        external
        parameterizedTest(numeratorDenominatorDifferentSign_Sets())
        whenDenominatorNotZero
        whenDenominatorNotMinSD59x18
        whenNumeratorNotZero
        whenNumeratorNotMinSD59x18
        whenResultDoesNotOverflowSD59x18
    {
        assertEq(div(s.x, s.y), s.expected, "SD59x18 div");
        assertEq(s.x / s.y, s.expected, "SD59x18 /");
    }
}
