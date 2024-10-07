// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { ud } from "src/ud60x18/Casting.sol";
import { E, MAX_UD60x18, MAX_WHOLE_UD60x18, PI, UNIT } from "src/ud60x18/Constants.sol";
import { PRBMath_UD60x18_Log_InputTooSmall } from "src/ud60x18/Errors.sol";
import { ln } from "src/ud60x18/Math.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { UD60x18_Unit_Test } from "../../UD60x18.t.sol";

contract Ln_Unit_Test is UD60x18_Unit_Test {
    function test_RevertWhen_LtUnit() external {
        UD60x18 x = UNIT - ud(1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_Log_InputTooSmall.selector, x));
        ln(x);
    }

    modifier whenGteUnit() {
        _;
    }

    function ln_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 1e18, expected: 0 }));
        sets.push(set({ x: 1.125e18, expected: 0.117783035656383442e18 }));
        sets.push(set({ x: 2e18, expected: 0.693147180559945309e18 }));
        sets.push(set({ x: E, expected: 0.99999999999999999e18 }));
        sets.push(set({ x: PI, expected: 1_144729885849400163 }));
        sets.push(set({ x: 4e18, expected: 1_386294361119890619 }));
        sets.push(set({ x: 8e18, expected: 2_079441541679835928 }));
        sets.push(set({ x: 1e24, expected: 13_815510557964274099 }));
        sets.push(set({ x: MAX_WHOLE_UD60x18, expected: 135_999146549453176925 }));
        sets.push(set({ x: MAX_UD60x18, expected: 135_999146549453176925 }));
        return sets;
    }

    function test_Ln() external parameterizedTest(ln_Sets()) whenGteUnit {
        UD60x18 actual = ln(s.x);
        assertEq(actual, s.expected, "UD60x18 ln");
    }
}
