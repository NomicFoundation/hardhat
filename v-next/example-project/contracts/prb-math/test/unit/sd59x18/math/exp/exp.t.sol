// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { E, EXP_MAX_INPUT, EXP_MIN_THRESHOLD, MIN_SD59x18, MIN_WHOLE_SD59x18, PI, UNIT, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Exp_InputTooBig } from "src/sd59x18/Errors.sol";
import { exp } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Exp_Unit_Test is SD59x18_Unit_Test {
    function test_Exp_Zero() external pure {
        SD59x18 x = ZERO;
        SD59x18 actual = exp(x);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 exp");
    }

    modifier whenNotZero() {
        _;
    }

    function ltThreshold_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18 }));
        sets.push(set({ x: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: EXP_MIN_THRESHOLD - sd(1) }));
        return sets;
    }

    function test_Exp_Negative_LtThreshold() external parameterizedTest(ltThreshold_Sets()) whenNotZero {
        SD59x18 actual = exp(s.x);
        assertEq(actual, s.expected, "SD59x18 exp");
    }

    function negativeAndGteThreshold_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SD59x18, expected: 0 }));
        sets.push(set({ x: EXP_MIN_THRESHOLD - sd(1), expected: 0 }));
        sets.push(set({ x: EXP_MIN_THRESHOLD, expected: 0.000000000000000001e18 }));
        sets.push(set({ x: -33.333333e18, expected: 0.000000000000003338e18 }));
        sets.push(set({ x: -20.82e18, expected: 0.0000000009077973e18 }));
        sets.push(set({ x: -16e18, expected: 0.000000112535174719e18 }));
        sets.push(set({ x: -11.89215e18, expected: 0.000006843919254514e18 }));
        sets.push(set({ x: -4e18, expected: 0.01831563888873418e18 }));
        sets.push(set({ x: NEGATIVE_PI, expected: 0.043213918263772249e18 }));
        sets.push(set({ x: -3e18, expected: 0.049787068367863943e18 }));
        sets.push(set({ x: NEGATIVE_E, expected: 0.065988035845312537e18 }));
        sets.push(set({ x: -2e18, expected: 0.135335283236612691e18 }));
        sets.push(set({ x: -1e18, expected: 0.367879441171442321e18 }));
        sets.push(set({ x: -1e3, expected: 0.999999999999999001e18 }));
        sets.push(set({ x: -1, expected: 1e18 }));
        return sets;
    }

    function test_Exp_Negative_GteMinPermitted() external parameterizedTest(negativeAndGteThreshold_Sets()) whenNotZero {
        SD59x18 actual = exp(s.x);
        assertEq(actual, s.expected, "SD59x18 exp");
    }

    function test_RevertWhen_Positive_GtMaxPermitted() external whenNotZero {
        SD59x18 x = EXP_MAX_INPUT + sd(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Exp_InputTooBig.selector, x));
        exp(x);
    }

    function positiveAndLteMaxPermitted_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, expected: 1e18 }));
        sets.push(set({ x: 0.000000000000001e18, expected: 1.000000000000000999e18 }));
        sets.push(set({ x: 1e18, expected: 2_718281828459045234 }));
        sets.push(set({ x: 2e18, expected: 7_389056098930650223 }));
        sets.push(set({ x: E, expected: 15_154262241479264171 }));
        sets.push(set({ x: 3e18, expected: 20_085536923187667724 }));
        sets.push(set({ x: PI, expected: 23_140692632779268962 }));
        sets.push(set({ x: 4e18, expected: 54_598150033144239019 }));
        sets.push(set({ x: 11.89215e18, expected: 146115_107851442195738190 }));
        sets.push(set({ x: 16e18, expected: 8886110_520507872601090007 }));
        sets.push(set({ x: 20.82e18, expected: 1101567497_354306722521735975 }));
        sets.push(set({ x: 33.333333e18, expected: 299559147061116_199277615819889397 }));
        sets.push(set({ x: 64e18, expected: 6235149080811616783682415370_612321304359995711 }));
        sets.push(set({ x: 71.002e18, expected: 6851360256686183998595702657852_843771046889809565 }));
        sets.push(set({ x: 88.722839111672999627e18, expected: 340282366920938463222979506443879150094_819893272894857679 }));
        sets.push(set({ x: EXP_MAX_INPUT, expected: 6277101735386680754977611748738314679353920434623901771623e18 }));
        return sets;
    }

    function test_Exp_Positive_LteMaxPermitted() external parameterizedTest(positiveAndLteMaxPermitted_Sets()) whenNotZero {
        SD59x18 actual = exp(s.x);
        assertEq(actual, s.expected, "SD59x18 exp");
    }
}
