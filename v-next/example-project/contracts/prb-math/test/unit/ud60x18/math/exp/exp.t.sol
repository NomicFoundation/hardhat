// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { ud } from "src/ud60x18/Casting.sol";
import { E, EXP_MAX_INPUT, PI, UNIT, ZERO } from "src/ud60x18/Constants.sol";
import { PRBMath_UD60x18_Exp_InputTooBig } from "src/ud60x18/Errors.sol";
import { exp } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Exp_Unit_Test is UD60x18_Unit_Test {
    function test_Exp_Zero() external pure {
        UD60x18 x = ZERO;
        UD60x18 actual = exp(x);
        UD60x18 expected = UNIT;
        assertEq(actual, expected, "UD60x18 exp");
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_GtMaxPermitted() external whenNotZero {
        UD60x18 x = EXP_MAX_INPUT + ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_Exp_InputTooBig.selector, x));
        exp(x);
    }

    modifier whenLteMaxPermitted() {
        _;
    }

    function exp_Sets() internal returns (Set[] memory) {
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

    function test_Exp() external parameterizedTest(exp_Sets()) whenNotZero whenLteMaxPermitted {
        UD60x18 actual = exp(s.x);
        assertEq(actual, s.expected, "UD60x18 exp");
    }
}
