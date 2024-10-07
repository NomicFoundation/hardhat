// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { console2 } from "forge-std/src/console2.sol";

import { sd } from "src/sd59x18/Casting.sol";
import { ZERO } from "src/sd59x18/Constants.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";
import { Base_Test } from "../../Base.t.sol";

/// @notice Common logic needed by all SD59x18 unit tests.
abstract contract SD59x18_Unit_Test is Base_Test {
    /*//////////////////////////////////////////////////////////////////////////
                                      CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    SD59x18 internal constant MAX_SCALED_SD59x18 = SD59x18.wrap(57896044618658097711785492504343953926634_992332820282019728);
    SD59x18 internal constant MIN_SCALED_SD59x18 = SD59x18.wrap(-57896044618658097711785492504343953926634_992332820282019728);
    SD59x18 internal constant NEGATIVE_E = SD59x18.wrap(-2_718281828459045235);
    SD59x18 internal constant NEGATIVE_PI = SD59x18.wrap(-3_141592653589793238);
    SD59x18 internal constant SQRT_MAX_SD59x18 = SD59x18.wrap(240615969168004511545033772477_625056927114980741);
    SD59x18 internal constant SQRT_MAX_UD60x18 = SD59x18.wrap(340282366920938463463374607431_768211455999999999);
    SD59x18 internal constant NEGATIVE_SQRT_MAX_SD59x18 = SD59x18.wrap(-240615969168004511545033772477_625056927114980741);
    SD59x18 internal constant NEGATIVE_SQRT_MAX_UD60x18 = SD59x18.wrap(-340282366920938463463374607431_768211455999999999);

    /// @dev This is needed to be passed as the "expected" argument. The "set" function cannot be overridden
    /// to have two implementations that each has two "int256" arguments.
    SD59x18 internal constant NIL = ZERO;

    /*//////////////////////////////////////////////////////////////////////////
                                       STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    struct Set {
        SD59x18 x;
        SD59x18 y;
        SD59x18 expected;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    Set internal s;
    Set[] internal sets;

    /*//////////////////////////////////////////////////////////////////////////
                                      MODIFIERS
    //////////////////////////////////////////////////////////////////////////*/

    modifier parameterizedTest(Set[] memory testSets) {
        uint256 length = testSets.length;
        for (uint256 i = 0; i < length;) {
            s = testSets[i];
            _;
            unchecked {
                i += 1;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                              CONSTANT HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////////////////*/

    function logSd(SD59x18 p0) internal pure {
        console2.logInt(p0.unwrap());
    }

    function sdToUint(SD59x18 x) internal pure returns (uint256 result) {
        result = uint256(x.unwrap());
    }

    function set(int256 x) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: ZERO, expected: ZERO });
    }

    function set(SD59x18 x) internal pure returns (Set memory) {
        return Set({ x: x, y: ZERO, expected: ZERO });
    }

    function set(int256 x, int256 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: ZERO, expected: sd(expected) });
    }

    function set(int256 x, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: ZERO, expected: expected });
    }

    function set(SD59x18 x, int256 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: ZERO, expected: sd(expected) });
    }

    function set(SD59x18 x, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: ZERO, expected: expected });
    }

    function set(int256 x, int256 y, int256 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: sd(y), expected: sd(expected) });
    }

    function set(int256 x, int256 y, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: sd(y), expected: expected });
    }

    function set(int256 x, SD59x18 y, int256 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: y, expected: sd(expected) });
    }

    function set(int256 x, SD59x18 y, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: sd(x), y: y, expected: expected });
    }

    function set(SD59x18 x, int256 y, int256 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: sd(y), expected: sd(expected) });
    }

    function set(SD59x18 x, SD59x18 y, int256 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: y, expected: sd(expected) });
    }

    function set(SD59x18 x, int256 y, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: sd(y), expected: expected });
    }

    function set(SD59x18 x, SD59x18 y, SD59x18 expected) internal pure returns (Set memory) {
        return Set({ x: x, y: y, expected: expected });
    }
}
