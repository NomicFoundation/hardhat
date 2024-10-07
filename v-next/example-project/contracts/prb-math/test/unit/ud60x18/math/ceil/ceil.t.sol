// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { ud } from "src/ud60x18/Casting.sol";
import { MAX_WHOLE_UD60x18, PI, ZERO } from "src/ud60x18/Constants.sol";
import { PRBMath_UD60x18_Ceil_Overflow } from "src/ud60x18/Errors.sol";
import { ceil } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract CeilTest is UD60x18_Unit_Test {
    function test_Ceil_Zero() external pure {
        UD60x18 x = ZERO;
        UD60x18 actual = ceil(x);
        UD60x18 expected = ZERO;
        assertEq(actual, expected, "UD60x18 ceil");
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_GtMaxPermitted() external whenNotZero {
        UD60x18 x = MAX_WHOLE_UD60x18 + ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_Ceil_Overflow.selector, x));
        ceil(x);
    }

    modifier whenLteMaxWholeUD60x18() {
        _;
    }

    function ceil_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.1e18, expected: 1e18 }));
        sets.push(set({ x: 0.5e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, expected: 1e18 }));
        sets.push(set({ x: 1.125e18, expected: 2e18 }));
        sets.push(set({ x: 2e18, expected: 2e18 }));
        sets.push(set({ x: PI, expected: 4e18 }));
        sets.push(set({ x: 4.2e18, expected: 5e18 }));
        sets.push(set({ x: 1e24, expected: 1e24 }));
        sets.push(set({ x: MAX_WHOLE_UD60x18, expected: MAX_WHOLE_UD60x18 }));
        return sets;
    }

    function test_Ceil() external parameterizedTest(ceil_Sets()) whenNotZero whenLteMaxWholeUD60x18 {
        UD60x18 actual = ceil(s.x);
        assertEq(actual, s.expected, "UD60x18 ceil");
    }
}
