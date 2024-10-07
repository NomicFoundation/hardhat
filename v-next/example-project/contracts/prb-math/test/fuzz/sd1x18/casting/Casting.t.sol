// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { sd1x18, wrap } from "src/sd1x18/Casting.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { MAX_SD1x18, MIN_SD1x18 } from "src/sd1x18/Constants.sol";
import {
    PRBMath_SD1x18_ToUD2x18_Underflow,
    PRBMath_SD1x18_ToUD60x18_Underflow,
    PRBMath_SD1x18_ToUint128_Underflow,
    PRBMath_SD1x18_ToUint256_Underflow,
    PRBMath_SD1x18_ToUint40_Overflow,
    PRBMath_SD1x18_ToUint40_Underflow
} from "src/sd1x18/Errors.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the casting functions available in SD1x18.
contract Casting_Fuzz_Test is Base_Test {
    function testFuzz_IntoSD59x18(SD1x18 x) external pure {
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(x.unwrap()));
        assertEq(actual, expected, "SD1x18 intoSD59x18");
    }

    function testFuzz_RevertWhen_UnderflowUD2x18(SD1x18 x) external {
        x = _bound(x, MIN_SD1x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUD2x18_Underflow.selector, x));
        x.intoUD2x18();
    }

    function testFuzz_IntoUD2x18(SD1x18 x) external pure {
        x = _bound(x, 0, MAX_SD1x18);
        UD2x18 actual = x.intoUD2x18();
        UD2x18 expected = UD2x18.wrap(uint64(x.unwrap()));
        assertEq(actual, expected, "SD1x18 intoUD2x18");
    }

    function testFuzz_RevertWhen_UnderflowUD60x18(SD1x18 x) external {
        x = _bound(x, MIN_SD1x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUD60x18_Underflow.selector, x));
        x.intoUD60x18();
    }

    function testFuzz_IntoUD60x18(SD1x18 x) external pure {
        x = _bound(x, 0, MAX_SD1x18);
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(uint64(x.unwrap()));
        assertEq(actual, expected, "SD1x18 intoUD60x18");
    }

    function testFuzz_RevertWhen_UnderflowUint256(SD1x18 x) external {
        x = _bound(x, MIN_SD1x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUint256_Underflow.selector, x));
        x.intoUint256();
    }

    function testFuzz_IntoUint256(SD1x18 x) external pure {
        x = _bound(x, 0, MAX_SD1x18);
        uint256 actual = x.intoUint256();
        uint256 expected = uint64(x.unwrap());
        assertEq(actual, expected, "SD1x18 intoUint256");
    }

    function testFuzz_RevertWhen_UnderflowUint128(SD1x18 x) external {
        x = _bound(x, MIN_SD1x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUint128_Underflow.selector, x));
        x.intoUint128();
    }

    function testFuzz_IntoUint128(SD1x18 x) external pure {
        x = _bound(x, 0, MAX_SD1x18);
        uint128 actual = x.intoUint128();
        uint128 expected = uint64(x.unwrap());
        assertEq(actual, expected, "SD1x18 intoUint128");
    }

    function testFuzz_RevertWhen_UnderflowUint40(SD1x18 x) external {
        x = _bound(x, MIN_SD1x18, -1);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUint40_Underflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_RevertWhen_OverflowUint40(SD1x18 x) external {
        x = _bound(x, int64(uint64(MAX_UINT40)) + 1, MAX_SD1x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_SD1x18_ToUint40_Overflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_IntoUint40(SD1x18 x) external pure {
        x = _bound(x, 0, int64(uint64(MAX_UINT40)));
        uint40 actual = x.intoUint40();
        uint40 expected = uint40(uint64(x.unwrap()));
        assertEq(actual, expected, "SD1x18 intoUint40");
    }

    function testFuzz_sd1x18(int64 x) external pure {
        SD1x18 actual = sd1x18(x);
        SD1x18 expected = SD1x18.wrap(x);
        assertEq(actual, expected, "sd1x18");
    }

    function testFuzz_Unwrap(SD1x18 x) external pure {
        int64 actual = x.unwrap();
        int64 expected = SD1x18.unwrap(x);
        assertEq(actual, expected, "SD1x18 unwrap");
    }

    function testFuzz_Wrap(int64 x) external pure {
        SD1x18 actual = wrap(x);
        SD1x18 expected = SD1x18.wrap(x);
        assertEq(actual, expected, "SD1x18 wrap");
    }
}
