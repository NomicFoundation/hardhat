// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { MAX_WHOLE_SD59x18, MIN_WHOLE_SD59x18 } from "src/sd59x18/Constants.sol";
import { convert } from "src/sd59x18/Conversions.sol";
import { PRBMath_SD59x18_Convert_Overflow, PRBMath_SD59x18_Convert_Underflow } from "src/sd59x18/Errors.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract ConvertTo_Unit_Test is SD59x18_Unit_Test {
    function test_RevertWhen_LtMinPermitted() external {
        int256 x = MIN_SCALED_SD59x18.unwrap() - 1;
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Convert_Underflow.selector, x));
        convert(x);
    }

    modifier whenGteMinPermitted() {
        _;
    }

    function test_RevertWhen_GtMaxPermitted() external whenGteMinPermitted {
        int256 x = MAX_SCALED_SD59x18.unwrap() + 1;
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Convert_Overflow.selector, x));
        convert(x);
    }

    modifier whenLteMaxPermitted() {
        _;
    }

    function convertTo_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: MIN_SCALED_SD59x18, expected: MIN_WHOLE_SD59x18 }));
        sets.push(set({ x: -3.1415e42, expected: -3.1415e60 }));
        sets.push(set({ x: -2.7182e38, expected: -2.7182e56 }));
        sets.push(set({ x: -1e24, expected: -1e42 }));
        sets.push(set({ x: -5e18, expected: -5e36 }));
        sets.push(set({ x: -1e18, expected: -1e36 }));
        sets.push(set({ x: -0.000000000000001729e18, expected: -1729e18 }));
        sets.push(set({ x: -0.000000000000000002e18, expected: -2e18 }));
        sets.push(set({ x: -0.000000000000000001e18, expected: -1e18 }));
        sets.push(set({ x: 0.000000000000000001e18, expected: 1e18 }));
        sets.push(set({ x: 0.000000000000000002e18, expected: 2e18 }));
        sets.push(set({ x: 0.000000000000001729e18, expected: 1729e18 }));
        sets.push(set({ x: 1e18, expected: 1e36 }));
        sets.push(set({ x: 5e18, expected: 5e36 }));
        sets.push(set({ x: 2.7182e38, expected: 2.7182e56 }));
        sets.push(set({ x: 3.1415e42, expected: 3.1415e60 }));
        sets.push(set({ x: MAX_SCALED_SD59x18, expected: MAX_WHOLE_SD59x18 }));
        return sets;
    }

    function test_ConvertTo() external parameterizedTest(convertTo_Sets()) whenGteMinPermitted whenLteMaxPermitted {
        SD59x18 x = convert(s.x.unwrap());
        assertEq(x, s.expected, "SD59x18 convert to");
    }
}
