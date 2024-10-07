// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import {
    PRBMathCastingUint256 as CastingUint256,
    PRBMath_IntoSD1x18_Overflow,
    PRBMath_IntoSD59x18_Overflow,
    PRBMath_IntoUD2x18_Overflow
} from "src/casting/Uint256.sol";
import { uMAX_SD1x18 } from "src/sd1x18/Constants.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { uMAX_SD59x18 } from "src/sd59x18/Constants.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { uMAX_UD2x18 } from "src/ud2x18/Constants.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../Base.t.sol";

/// @dev Collection of tests for the casting library available for uint256.
contract CastingUint256_Test is Base_Test {
    using CastingUint256 for uint256;

    function testFuzz_RevertWhen_OverflowSD1x18(uint256 x) external {
        x = _bound(x, uint64(uMAX_SD1x18) + 1, type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_IntoSD1x18_Overflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_intoSD1x18(uint256 x) external pure {
        x = _bound(x, 0, uint64(uMAX_SD1x18));
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(uint64(x)));
        assertEq(actual, expected, "uint256 intoSD1x18");
    }

    function testFuzz_RevertWhen_OverflowSD59x18(uint256 x) external {
        x = _bound(x, uint256(uMAX_SD59x18) + 1, type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_IntoSD59x18_Overflow.selector, x));
        x.intoSD59x18();
    }

    function testFuzz_intoSD59x18(uint256 x) external pure {
        x = _bound(x, 0, uint256(uMAX_SD59x18));
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(uint256(x)));
        assertEq(actual, expected, "uint256 intoSD59x18");
    }

    function testFuzz_RevertWhen_OverflowUD2x18(uint256 x) external {
        x = _bound(x, uint256(uMAX_UD2x18) + 1, type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_IntoUD2x18_Overflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_intoUD2x18(uint256 x) external pure {
        x = _bound(x, 0, uint256(uMAX_UD2x18));
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(x));
        assertEq(actual, expected, "uint256 intoUD2x18");
    }

    function testFuzz_intoUD60x18(uint256 x) external pure {
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(x);
        assertEq(actual, expected, "uint256 intoUD60x18");
    }
}
