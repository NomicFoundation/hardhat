// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd } from "src/sd59x18/Casting.sol";
import { E, MAX_SD59x18, MAX_WHOLE_SD59x18, PI, ZERO } from "src/sd59x18/Constants.sol";
import { PRBMath_SD59x18_Log_InputTooSmall } from "src/sd59x18/Errors.sol";
import { ln } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Ln_Unit_Test is SD59x18_Unit_Test {
    function test_RevertWhen_Zero() external {
        SD59x18 x = ZERO;
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Log_InputTooSmall.selector, x));
        ln(x);
    }

    modifier whenNotZero() {
        _;
    }

    function test_RevertWhen_Negative() external whenNotZero {
        SD59x18 x = sd(-1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_Log_InputTooSmall.selector, x));
        ln(x);
    }

    modifier whenPositive() {
        _;
    }

    function ln_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.1e18, expected: -2_302585092994045674 }));
        sets.push(set({ x: 0.2e18, expected: -1_609437912434100365 }));
        sets.push(set({ x: 0.3e18, expected: -1_203972804325935984 }));
        sets.push(set({ x: 0.4e18, expected: -0.916290731874155055e18 }));
        sets.push(set({ x: 0.5e18, expected: -0.693147180559945309e18 }));
        sets.push(set({ x: 0.6e18, expected: -0.510825623765990674e18 }));
        sets.push(set({ x: 0.7e18, expected: -0.356674943938732371e18 }));
        sets.push(set({ x: 0.8e18, expected: -0.223143551314209746e18 }));
        sets.push(set({ x: 0.9e18, expected: -0.105360515657826292e18 }));
        sets.push(set({ x: 1e18, expected: 0 }));
        sets.push(set({ x: 1.125e18, expected: 0.117783035656383442e18 }));
        sets.push(set({ x: 2e18, expected: 0.693147180559945309e18 }));
        sets.push(set({ x: E, expected: 0.99999999999999999e18 }));
        sets.push(set({ x: PI, expected: 1_144729885849400163 }));
        sets.push(set({ x: 4e18, expected: 1_386294361119890619 }));
        sets.push(set({ x: 8e18, expected: 2_079441541679835928 }));
        sets.push(set({ x: 1e24, expected: 13_815510557964274099 }));
        sets.push(set({ x: MAX_WHOLE_SD59x18, expected: 135_305999368893231615 }));
        sets.push(set({ x: MAX_SD59x18, expected: 135_305999368893231615 }));
        return sets;
    }

    function test_Ln() external parameterizedTest(ln_Sets()) whenNotZero whenPositive {
        SD59x18 actual = ln(s.x);
        assertEq(actual, s.expected, "SD59x18 ln");
    }
}
