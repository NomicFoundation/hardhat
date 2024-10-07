// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { E, MAX_SD59x18, MAX_WHOLE_SD59x18, MIN_SD59x18, MIN_WHOLE_SD59x18, PI } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Gm_Overflow, PRBMath_SD59x18_Gm_NegativeProduct } from "src/sd59x18/Errors.sol";
import { gm } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Gm_Unit_Test is SD59x18_Unit_Test {
    /// @dev Greatest number whose non-fixed-point square fits within int256
    SD59x18 internal constant SQRT_MAX_INT256 = SD59x18.wrap(240615969168004511545_033772477625056927);
    /// @dev Smallest number whose non-fixed-point square fits within int256
    SD59x18 internal constant NEGATIVE_SQRT_MAX_INT256 = SD59x18.wrap(-240615969168004511545033772477625056927);

    function oneOperandZero_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0, y: PI, expected: 0 }));
        sets.push(set({ x: PI, y: 0, expected: 0 }));
        return sets;
    }

    function test_Gm_OneOperandZero() external parameterizedTest(oneOperandZero_Sets()) {
        SD59x18 actual = gm(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 gm");
    }

    modifier whenOperandsNotZero() {
        _;
    }

    function test_RevertWhen_ProductNegative_A() external whenOperandsNotZero {
        SD59x18 x = sd(-1e18);
        SD59x18 y = PI;
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_NegativeProduct.selector, x, y));
        gm(x, y);
    }

    function test_RevertWhen_ProductNegative_B() external whenOperandsNotZero {
        SD59x18 x = PI;
        SD59x18 y = sd(-1e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_NegativeProduct.selector, x, y));
        gm(x, y);
    }

    modifier whenProductPositive() {
        _;
    }

    function test_RevertWhen_ProductOverflow_A() external whenOperandsNotZero whenProductPositive {
        SD59x18 x = MIN_SD59x18;
        SD59x18 y = sd(0.000000000000000002e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_Overflow.selector, x, y));
        gm(x, y);
    }

    function test_RevertWhen_ProductOverflow_B() external whenOperandsNotZero whenProductPositive {
        SD59x18 x = NEGATIVE_SQRT_MAX_INT256;
        SD59x18 y = NEGATIVE_SQRT_MAX_INT256 - sd(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_Overflow.selector, x, y));
        gm(x, y);
    }

    function test_RevertWhen_ProductOverflow_C() external whenOperandsNotZero whenProductPositive {
        SD59x18 x = SQRT_MAX_INT256 + sd(1);
        SD59x18 y = SQRT_MAX_INT256 + sd(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_Overflow.selector, x, y));
        gm(x, y);
    }

    function test_RevertWhen_ProductOverflow_D() external whenOperandsNotZero whenProductPositive {
        SD59x18 x = MAX_SD59x18;
        SD59x18 y = sd(0.000000000000000002e18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Gm_Overflow.selector, x, y));
        gm(x, y);
    }

    modifier whenProductDoesNotOverflow() {
        _;
    }

    function gm_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_WHOLE_SD59x18, y: -0.000000000000000001e18, expected: SQRT_MAX_INT256 }));
        sets.push(set({ x: NEGATIVE_SQRT_MAX_INT256, y: NEGATIVE_SQRT_MAX_INT256, expected: SQRT_MAX_INT256 }));
        sets.push(set({ x: -2404.8e18, y: -7899.210662e18, expected: 4358_442588812843362311 }));
        sets.push(set({ x: -322.47e18, y: -674.77e18, expected: 466_468736251423392217 }));
        sets.push(set({ x: NEGATIVE_PI, y: -8.2e18, expected: 5_075535416036056441 }));
        sets.push(set({ x: NEGATIVE_E, y: -89.01e18, expected: 15_554879155787087514 }));
        sets.push(set({ x: -2e18, y: -8e18, expected: 4e18 }));
        sets.push(set({ x: -1e18, y: -4e18, expected: 2e18 }));
        sets.push(set({ x: -1e18, y: -1e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, y: 1e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, y: 4e18, expected: 2e18 }));
        sets.push(set({ x: 2e18, y: 8e18, expected: 4e18 }));
        sets.push(set({ x: E, y: 89.01e18, expected: 15_554879155787087514 }));
        sets.push(set({ x: PI, y: 8.2e18, expected: 5_075535416036056441 }));
        sets.push(set({ x: 322.47e18, y: 674.77e18, expected: 466_468736251423392217 }));
        sets.push(set({ x: 2404.8e18, y: 7899.210662e18, expected: 4358_442588812843362311 }));
        sets.push(set({ x: SQRT_MAX_INT256, y: SQRT_MAX_INT256, expected: SQRT_MAX_INT256 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, y: 0.000000000000000001e18, expected: SQRT_MAX_INT256 }));
        sets.push(set({ x: MAX_SD59x18, y: 0.000000000000000001e18, expected: SQRT_MAX_INT256 }));
        return sets;
    }

    function test_Gm() external parameterizedTest(gm_Sets()) whenOperandsNotZero whenProductPositive whenProductDoesNotOverflow {
        SD59x18 actual = gm(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 gm");
    }
}
