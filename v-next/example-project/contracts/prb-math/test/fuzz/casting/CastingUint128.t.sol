// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import {
    PRBMathCastingUint128 as CastingUint128,
    PRBMath_IntoSD1x18_Overflow,
    PRBMath_IntoUD2x18_Overflow
} from "src/casting/Uint128.sol";
import { uMAX_SD1x18 } from "src/sd1x18/Constants.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { uMAX_UD2x18 } from "src/ud2x18/Constants.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../Base.t.sol";

/// @dev Collection of tests for the casting library available for uint128.
contract CastingUint128_Test is Base_Test {
    using CastingUint128 for uint128;

    function testFuzz_RevertWhen_OverflowSD1x18(uint128 x) external {
        x = boundUint128(x, uint128(uint64(uMAX_SD1x18)) + 1, MAX_UINT128);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_IntoSD1x18_Overflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_intoSD1x18(uint128 x) external pure {
        x = boundUint128(x, 0, uint128(uint64(uMAX_SD1x18)));
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(uint64(x)));
        assertEq(actual, expected, "uint128 intoSD1x18");
    }

    function testFuzz_intoSD59x18(uint128 x) external pure {
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(uint256(x)));
        assertEq(actual, expected, "uint128 intoSD59x18");
    }

    function testFuzz_RevertWhen_OverflowUD2x18(uint128 x) external {
        x = boundUint128(x, uint128(uMAX_UD2x18) + 1, MAX_UINT128);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_IntoUD2x18_Overflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_intoUD2x18(uint128 x) external pure {
        x = boundUint128(x, 0, uint128(uMAX_UD2x18));
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(x));
        assertEq(actual, expected, "uint128 intoUD2x18");
    }

    function testFuzz_intoUD60x18(uint128 x) external pure {
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(uint256(x));
        assertEq(actual, expected, "uint128 intoUD60x18");
    }

    function boundUint128(uint128 x, uint128 min, uint128 max) internal pure returns (uint128 result) {
        result = uint128(_bound(uint256(x), uint256(min), uint256(max)));
    }
}
