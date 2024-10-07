// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19;

import { StdAssertions } from "forge-std/src/StdAssertions.sol";

import { SD1x18 } from "../../src/sd1x18/ValueType.sol";
import { SD59x18 } from "../../src/sd59x18/ValueType.sol";
import { UD2x18 } from "../../src/ud2x18/ValueType.sol";
import { UD60x18 } from "../../src/ud60x18/ValueType.sol";

contract PRBMathAssertions is StdAssertions {
    /*//////////////////////////////////////////////////////////////////////////
                                       SD1X18
    //////////////////////////////////////////////////////////////////////////*/

    function assertEq(SD1x18 a, SD1x18 b) internal pure {
        assertEq(SD1x18.unwrap(a), SD1x18.unwrap(b));
    }

    function assertEq(SD1x18 a, SD1x18 b, string memory err) internal pure {
        assertEq(SD1x18.unwrap(a), SD1x18.unwrap(b), err);
    }

    function assertEq(SD1x18 a, int64 b) internal pure {
        assertEq(SD1x18.unwrap(a), b);
    }

    function assertEq(SD1x18 a, int64 b, string memory err) internal pure {
        assertEq(SD1x18.unwrap(a), b, err);
    }

    function assertEq(int64 a, SD1x18 b) internal pure {
        assertEq(a, SD1x18.unwrap(b));
    }

    function assertEq(int64 a, SD1x18 b, string memory err) internal pure {
        assertEq(a, SD1x18.unwrap(b), err);
    }

    function assertEq(SD1x18[] memory a, SD1x18[] memory b) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(SD1x18[] memory a, SD1x18[] memory b, string memory err) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(SD1x18[] memory a, int64[] memory b) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(SD1x18[] memory a, int64[] memory b, string memory err) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(int64[] memory a, SD1x18[] memory b) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(int64[] memory a, SD1x18[] memory b, string memory err) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       SD59X18
    //////////////////////////////////////////////////////////////////////////*/

    function assertEq(SD59x18 a, SD59x18 b) internal pure {
        assertEq(SD59x18.unwrap(a), SD59x18.unwrap(b));
    }

    function assertEq(SD59x18 a, SD59x18 b, string memory err) internal pure {
        assertEq(SD59x18.unwrap(a), SD59x18.unwrap(b), err);
    }

    function assertEq(SD59x18 a, int256 b) internal pure {
        assertEq(SD59x18.unwrap(a), b);
    }

    function assertEq(SD59x18 a, int256 b, string memory err) internal pure {
        assertEq(SD59x18.unwrap(a), b, err);
    }

    function assertEq(int256 a, SD59x18 b) internal pure {
        assertEq(a, SD59x18.unwrap(b));
    }

    function assertEq(int256 a, SD59x18 b, string memory err) internal pure {
        assertEq(a, SD59x18.unwrap(b), err);
    }

    function assertEq(SD59x18[] memory a, SD59x18[] memory b) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(SD59x18[] memory a, SD59x18[] memory b, string memory err) internal pure {
        int256[] memory castedA;
        int256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(SD59x18[] memory a, int256[] memory b) internal pure {
        int256[] memory castedA;
        assembly {
            castedA := a
        }
        assertEq(castedA, b);
    }

    function assertEq(SD59x18[] memory a, int256[] memory b, string memory err) internal pure {
        int256[] memory castedA;
        assembly {
            castedA := a
        }
        assertEq(castedA, b, err);
    }

    function assertEq(int256[] memory a, SD59x18[] memory b) internal {
        int256[] memory castedB;
        assembly {
            castedB := b
        }
        assertEq(a, b);
    }

    function assertEq(int256[] memory a, SD59x18[] memory b, string memory err) internal {
        int256[] memory castedB;
        assembly {
            castedB := b
        }
        assertEq(a, b, err);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       UD2X18
    //////////////////////////////////////////////////////////////////////////*/

    function assertEq(UD2x18 a, UD2x18 b) internal pure {
        assertEq(UD2x18.unwrap(a), UD2x18.unwrap(b));
    }

    function assertEq(UD2x18 a, UD2x18 b, string memory err) internal pure {
        assertEq(UD2x18.unwrap(a), UD2x18.unwrap(b), err);
    }

    function assertEq(UD2x18 a, uint64 b) internal pure {
        assertEq(UD2x18.unwrap(a), uint256(b));
    }

    function assertEq(UD2x18 a, uint64 b, string memory err) internal pure {
        assertEq(UD2x18.unwrap(a), uint256(b), err);
    }

    function assertEq(uint64 a, UD2x18 b) internal pure {
        assertEq(uint256(a), UD2x18.unwrap(b));
    }

    function assertEq(uint64 a, UD2x18 b, string memory err) internal pure {
        assertEq(uint256(a), UD2x18.unwrap(b), err);
    }

    function assertEq(UD2x18[] memory a, UD2x18[] memory b) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(UD2x18[] memory a, UD2x18[] memory b, string memory err) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(UD2x18[] memory a, uint64[] memory b) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(UD2x18[] memory a, uint64[] memory b, string memory err) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(uint64[] memory a, UD2x18[] memory b) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(uint64[] memory a, UD2x18[] memory b, string memory err) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       UD60X18
    //////////////////////////////////////////////////////////////////////////*/

    function assertEq(UD60x18 a, UD60x18 b) internal pure {
        assertEq(UD60x18.unwrap(a), UD60x18.unwrap(b));
    }

    function assertEq(UD60x18 a, UD60x18 b, string memory err) internal pure {
        assertEq(UD60x18.unwrap(a), UD60x18.unwrap(b), err);
    }

    function assertEq(UD60x18 a, uint256 b) internal pure {
        assertEq(UD60x18.unwrap(a), b);
    }

    function assertEq(UD60x18 a, uint256 b, string memory err) internal pure {
        assertEq(UD60x18.unwrap(a), b, err);
    }

    function assertEq(uint256 a, UD60x18 b) internal pure {
        assertEq(a, UD60x18.unwrap(b));
    }

    function assertEq(uint256 a, UD60x18 b, string memory err) internal pure {
        assertEq(a, UD60x18.unwrap(b), err);
    }

    function assertEq(UD60x18[] memory a, UD60x18[] memory b) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB);
    }

    function assertEq(UD60x18[] memory a, UD60x18[] memory b, string memory err) internal pure {
        uint256[] memory castedA;
        uint256[] memory castedB;
        assembly {
            castedA := a
            castedB := b
        }
        assertEq(castedA, castedB, err);
    }

    function assertEq(UD60x18[] memory a, uint256[] memory b) internal pure {
        uint256[] memory castedA;
        assembly {
            castedA := a
        }
        assertEq(castedA, b);
    }

    function assertEq(UD60x18[] memory a, uint256[] memory b, string memory err) internal pure {
        uint256[] memory castedA;
        assembly {
            castedA := a
        }
        assertEq(castedA, b, err);
    }

    function assertEq(uint256[] memory a, SD59x18[] memory b) internal {
        uint256[] memory castedB;
        assembly {
            castedB := b
        }
        assertEq(a, b);
    }

    function assertEq(uint256[] memory a, SD59x18[] memory b, string memory err) internal {
        uint256[] memory castedB;
        assembly {
            castedB := b
        }
        assertEq(a, b, err);
    }
}
