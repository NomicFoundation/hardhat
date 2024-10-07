// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { uMAX_SD1x18 } from "src/sd1x18/Constants.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { uMAX_SD59x18 } from "src/sd59x18/Constants.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { uMAX_UD2x18 } from "src/ud2x18/Constants.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { ud, ud60x18, wrap } from "src/ud60x18/Casting.sol";
import { MAX_UD60x18 } from "src/ud60x18/Constants.sol";
import {
    PRBMath_UD60x18_IntoSD1x18_Overflow,
    PRBMath_UD60x18_IntoSD59x18_Overflow,
    PRBMath_UD60x18_IntoUD2x18_Overflow,
    PRBMath_UD60x18_IntoUint128_Overflow,
    PRBMath_UD60x18_IntoUint40_Overflow
} from "src/ud60x18/Errors.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the casting functions available in UD60x18.
contract UD60x18_Casting_Fuzz_Test is Base_Test {
    function testFuzz_RevertWhen_OverflowSD1x18(UD60x18 x) external {
        x = _bound(x, ud(uint64(uMAX_SD1x18) + 1), MAX_UD60x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_IntoSD1x18_Overflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_intoSD1x18(UD60x18 x) external pure {
        x = _bound(x, 0, ud(uint64(uMAX_SD1x18)));
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(uint64(x.unwrap())));
        assertEq(actual, expected, "UD60x18 intoSD1x18");
    }

    function testFuzz_RevertWhen_OverflowSD59x18(UD60x18 x) external {
        x = _bound(x, ud(uint256(uMAX_SD59x18) + 1), MAX_UD60x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_IntoSD59x18_Overflow.selector, x));
        x.intoSD59x18();
    }

    function testFuzz_intoSD59x18(UD60x18 x) external pure {
        x = _bound(x, 0, ud(uint256(uMAX_SD59x18)));
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(uint256(x.unwrap())));
        assertEq(actual, expected, "UD60x18 intoSD59x18");
    }

    function testFuzz_RevertWhen_OverflowUD2x18(UD60x18 x) external {
        x = _bound(x, ud(uint256(uMAX_UD2x18) + 1), MAX_UD60x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_IntoUD2x18_Overflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_intoUD2x18(UD60x18 x) external pure {
        x = _bound(x, 0, ud(uint256(uMAX_UD2x18)));
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(x.unwrap()));
        assertEq(actual, expected, "UD60x18 intoUD2x18");
    }

    function testFuzz_RevertWhen_OverflowUint128(UD60x18 x) external {
        x = _bound(x, ud(uint256(MAX_UINT128) + 1), MAX_UD60x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_IntoUint128_Overflow.selector, x));
        x.intoUint128();
    }

    function testFuzz_intoUint128(UD60x18 x) external pure {
        x = _bound(x, 0, ud(uint256(MAX_UINT128)));
        uint128 actual = x.intoUint128();
        uint128 expected = uint128(x.unwrap());
        assertEq(actual, expected, "UD60x18 intoUint128");
    }

    function testFuzz_intoUint256(UD60x18 x) external pure {
        uint256 actual = x.intoUint256();
        uint256 expected = x.unwrap();
        assertEq(actual, expected, "UD60x18 intoUint256");
    }

    function testFuzz_RevertWhen_OverflowUint40(UD60x18 x) external {
        x = _bound(x, ud(uint256(MAX_UINT40) + 1), MAX_UD60x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD60x18_IntoUint40_Overflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_intoUint40(UD60x18 x) external pure {
        x = _bound(x, 0, ud(uint256(MAX_UINT40)));
        uint40 actual = uint40(x.intoUint40());
        uint40 expected = uint40(x.unwrap());
        assertEq(actual, expected, "UD60x18 intoUint40");
    }

    function testFuzz_Ud(uint256 x) external pure {
        UD60x18 actual = ud(x);
        UD60x18 expected = UD60x18.wrap(x);
        assertEq(actual, expected, "ud");
    }

    function testFuzz_UD60x18(uint256 x) external pure {
        UD60x18 actual = ud60x18(x);
        UD60x18 expected = UD60x18.wrap(x);
        assertEq(actual, expected, "ud60x18");
    }

    function testFuzz_Unwrap(UD60x18 x) external pure {
        uint256 actual = x.unwrap();
        uint256 expected = UD60x18.unwrap(x);
        assertEq(actual, expected, "UD60x18 unwrap");
    }

    function testFuzz_Wrap(uint256 x) external pure {
        UD60x18 actual = wrap(x);
        UD60x18 expected = UD60x18.wrap(x);
        assertEq(actual, expected, "UD60x18 wrap");
    }
}
