// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { uMAX_SD1x18, uMIN_SD1x18 } from "src/sd1x18/Constants.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { sd, sd59x18, wrap } from "src/sd59x18/Casting.sol";
import { MAX_SD59x18, MIN_SD59x18 } from "src/sd59x18/Constants.sol";
import {
    PRBMath_SD59x18_IntoSD1x18_Overflow,
    PRBMath_SD59x18_IntoSD1x18_Underflow,
    PRBMath_SD59x18_IntoUD60x18_Underflow,
    PRBMath_SD59x18_IntoUint256_Underflow,
    PRBMath_SD59x18_IntoUD2x18_Overflow,
    PRBMath_SD59x18_IntoUD2x18_Underflow,
    PRBMath_SD59x18_IntoUint128_Overflow,
    PRBMath_SD59x18_IntoUint128_Underflow,
    PRBMath_SD59x18_IntoUint40_Overflow,
    PRBMath_SD59x18_IntoUint40_Underflow
} from "src/sd59x18/Errors.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { uMAX_UD2x18 } from "src/ud2x18/Constants.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the casting functions available in SD59x18.
contract SD59x18_Casting_Fuzz_Test is Base_Test {
    function testFuzz_IntoInt256(SD59x18 x) external pure {
        int256 actual = x.intoInt256();
        int256 expected = SD59x18.unwrap(x);
        assertEq(actual, expected, "SD59x18 intoInt256");
    }

    function testFuzz_RevertWhen_UnderflowSD1x18(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, int256(uMIN_SD1x18) - 1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoSD1x18_Underflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_RevertWhen_OverflowSD1x18(SD59x18 x) external {
        x = _bound(x, int256(uMAX_SD1x18) + 1, MAX_SD59x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoSD1x18_Overflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_IntoSD1x18(SD59x18 x) external pure {
        x = _bound(x, uMIN_SD1x18, uMAX_SD1x18);
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(x.unwrap()));
        assertEq(actual, expected, "SD59x18 intoSD1x18");
    }

    function testFuzz_RevertWhen_UnderflowUD2x18(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUD2x18_Underflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_RevertWhen_OverflowUD2x18(SD59x18 x) external {
        x = _bound(x, int256(uint256(uMAX_UD2x18)) + 1, MAX_SD59x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUD2x18_Overflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_IntoUD2x18(SD59x18 x) external pure {
        x = _bound(x, 0, int256(uint256(uMAX_UD2x18)));
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(uint256(x.unwrap())));
        assertEq(actual, expected, "SD59x18 intoUD2x18");
    }

    function testFuzz_RevertWhen_UnderflowUD60x18(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUD60x18_Underflow.selector, x));
        x.intoUD60x18();
    }

    function testFuzz_IntoUD60x18(SD59x18 x) external pure {
        x = _bound(x, 0, MAX_SD59x18);
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(uint256(x.unwrap()));
        assertEq(actual, expected, "SD59x18 intoUD60x18");
    }

    function testFuzz_RevertWhen_UnderflowUint128(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUint128_Underflow.selector, x));
        x.intoUint128();
    }

    function testFuzz_RevertWhen_OverflowUint128(SD59x18 x) external {
        x = _bound(x, int256(uint256(MAX_UINT128)) + 1, MAX_SD59x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUint128_Overflow.selector, x));
        x.intoUint128();
    }

    function testFuzz_IntoUint128(SD59x18 x) external pure {
        x = _bound(x, 0, int256(uint256(MAX_UINT128)));
        uint128 actual = x.intoUint128();
        uint128 expected = uint128(uint256(x.unwrap()));
        assertEq(actual, expected, "SD59x18 intoUint128");
    }

    function testFuzz_RevertWhen_UnderflowUint256(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUint256_Underflow.selector, x));
        x.intoUint256();
    }

    function testFuzz_IntoUint256(SD59x18 x) external pure {
        x = _bound(x, 0, MAX_SD59x18);
        uint256 actual = x.intoUint256();
        uint256 expected = uint256(x.unwrap());
        assertEq(actual, expected, "SD59x18 intoUint256");
    }

    function testFuzz_RevertWhen_UnderflowUint40(SD59x18 x) external {
        x = _bound(x, MIN_SD59x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUint40_Underflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_RevertWhen_OverflowUint40(SD59x18 x) external {
        x = _bound(x, int256(uint256(MAX_UINT40)) + 1, MAX_SD59x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD59x18_IntoUint40_Overflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_IntoUint40(SD59x18 x) external pure {
        x = _bound(x, 0, int256(uint256(MAX_UINT40)));
        uint40 actual = x.intoUint40();
        uint40 expected = uint40(uint256(x.unwrap()));
        assertEq(actual, expected, "SD59x18 intoUint40");
    }

    function testFuzz_Sd(int256 x) external pure {
        SD59x18 actual = sd(x);
        SD59x18 expected = SD59x18.wrap(x);
        assertEq(actual, expected, "sd");
    }

    function testFuzz_sd59x18(int256 x) external pure {
        SD59x18 actual = sd59x18(x);
        SD59x18 expected = SD59x18.wrap(x);
        assertEq(actual, expected, "sd59x18");
    }

    function testFuzz_Unwrap(SD59x18 x) external pure {
        int256 actual = x.unwrap();
        int256 expected = SD59x18.unwrap(x);
        assertEq(actual, expected, "SD59x18 unwrap");
    }

    function testFuzz_Wrap(int256 x) external pure {
        SD59x18 actual = wrap(x);
        SD59x18 expected = SD59x18.wrap(x);
        assertEq(actual, expected, "SD59x18 wrap");
    }
}
