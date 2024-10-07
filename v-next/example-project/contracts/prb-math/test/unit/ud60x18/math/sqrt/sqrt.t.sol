// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { E, PI, ZERO } from "src/ud60x18/Constants.sol";
import { PRBMath_UD60x18_Sqrt_Overflow } from "src/ud60x18/Errors.sol";
import { sqrt } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Sqrt_Unit_Test is UD60x18_Unit_Test {
    UD60x18 internal constant MAX_PERMITTED = UD60x18.wrap(115792089237316195423570985008687907853269_984665640564039457);

    function test_Sqrt_Zero() external pure {
        UD60x18 x = ZERO;
        UD60x18 actual = sqrt(x);
        UD60x18 expected = ZERO;
        assertEq(actual, expected, "UD60x18 sqrt");
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_GtMaxPermitted() external whenNotZero {
        UD60x18 x = MAX_PERMITTED + ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_Sqrt_Overflow.selector, x));
        sqrt(x);
    }

    modifier whenLteMaxPermitted() {
        _;
    }

    function sqrt_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, expected: 0.000000001e18 }));
        sets.push(set({ x: 0.000000000000001e18, expected: 0.000000031622776601e18 }));
        sets.push(set({ x: 1e18, expected: 1e18 }));
        sets.push(set({ x: 2e18, expected: 1_414213562373095048 }));
        sets.push(set({ x: E, expected: 1_648721270700128146 }));
        sets.push(set({ x: 3e18, expected: 1_732050807568877293 }));
        sets.push(set({ x: PI, expected: 1_772453850905516027 }));
        sets.push(set({ x: 4e18, expected: 2e18 }));
        sets.push(set({ x: 16e18, expected: 4e18 }));
        sets.push(set({ x: 1e35, expected: 316227766_016837933199889354 }));
        sets.push(set({ x: 12489131238983290393813_123784889921092801, expected: 111754781727_598977910452220959 }));
        sets.push(set({ x: 1889920002192904839344128288891377_732371920009212883, expected: 43473210166640613973238162807779776 }));
        sets.push(set({ x: 1e58, expected: 1e38 }));
        sets.push(set({ x: 5e58, expected: 223606797749978969640_917366873127623544 }));
        sets.push(set({ x: MAX_PERMITTED, expected: 340282366920938463463_374607431768211455 }));
        return sets;
    }

    function test_Sqrt() external parameterizedTest(sqrt_Sets()) whenNotZero whenLteMaxPermitted {
        UD60x18 actual = sqrt(s.x);
        assertEq(actual, s.expected, "UD60x18 sqrt");
    }
}
