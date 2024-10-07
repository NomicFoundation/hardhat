// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { uMAX_SD1x18 } from "src/sd1x18/Constants.sol";
import { SD1x18 } from "src/sd1x18/ValueType.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { ud2x18, wrap } from "src/ud2x18/Casting.sol";
import { uMAX_UD2x18 } from "src/ud2x18/Constants.sol";
import { PRBMath_UD2x18_IntoSD1x18_Overflow, PRBMath_UD2x18_IntoUint40_Overflow } from "src/ud2x18/Errors.sol";
import { UD2x18 } from "src/ud2x18/ValueType.sol";
import { UD60x18 } from "src/ud60x18/ValueType.sol";

import { Base_Test } from "../../../Base.t.sol";

/// @dev Collection of tests for the casting functions available in UD2x18.
contract UD2x18_Casting_Fuzz_Test is Base_Test {
    function testFuzz_RevertWhen_OverflowSD1x18(UD2x18 x) external {
        x = _bound(x, uint64(uMAX_SD1x18) + 1, uMAX_UD2x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD2x18_IntoSD1x18_Overflow.selector, x));
        x.intoSD1x18();
    }

    function testFuzz_IntoSD1x18(UD2x18 x) external pure {
        x = _bound(x, 0, uint64(uMAX_SD1x18));
        SD1x18 actual = x.intoSD1x18();
        SD1x18 expected = SD1x18.wrap(int64(uint64(x.unwrap())));
        assertEq(actual, expected, "UD2x18 intoSD1x18");
    }

    function testFuzz_IntoSD59x18(UD2x18 x) external pure {
        SD59x18 actual = x.intoSD59x18();
        SD59x18 expected = SD59x18.wrap(int256(uint256(x.unwrap())));
        assertEq(actual, expected, "UD2x18 intoSD59x18");
    }

    function testFuzz_IntoUD60x18(UD2x18 x) external pure {
        UD60x18 actual = x.intoUD60x18();
        UD60x18 expected = UD60x18.wrap(uint256(x.unwrap()));
        assertEq(actual, expected, "UD2x18 intoUD60x18");
    }

    function testFuzz_IntoUint128(UD2x18 x) external pure {
        uint128 actual = x.intoUint128();
        uint128 expected = uint128(x.unwrap());
        assertEq(actual, expected, "UD2x18 intoUint128");
    }

    function testFuzz_IntoUint256(UD2x18 x) external pure {
        uint256 actual = x.intoUint256();
        uint256 expected = uint256(x.unwrap());
        assertEq(actual, expected, "UD2x18 intoUint256");
    }

    function testFuzz_RevertWhen_OverflowUint40(UD2x18 x) external {
        x = _bound(x, uint64(MAX_UINT40) + 1, uMAX_UD2x18);
        vm.expectRevert(abi.encodeWithSelector(PRBMath_UD2x18_IntoUint40_Overflow.selector, x));
        x.intoUint40();
    }

    function testFuzz_IntoUint40(UD2x18 x) external pure {
        x = _bound(x, 0, uint64(MAX_UINT40));
        uint40 actual = x.intoUint40();
        uint40 expected = uint40(x.unwrap());
        assertEq(actual, expected, "UD2x18 intoUint40");
    }

    function testFuzz_ud2x18(uint64 x) external pure {
        UD2x18 actual = ud2x18(x);
        UD2x18 expected = UD2x18.wrap(x);
        assertEq(actual, expected, "ud2x18");
    }

    function testFuzz_Unwrap(UD2x18 x) external pure {
        uint64 actual = x.unwrap();
        uint64 expected = UD2x18.unwrap(x);
        assertEq(actual, expected, "UD2x18 unwrap");
    }

    function testFuzz_Wrap(uint64 x) external pure {
        UD2x18 actual = wrap(x);
        UD2x18 expected = UD2x18.wrap(x);
        assertEq(actual, expected, "UD2x18 wrap");
    }
}
