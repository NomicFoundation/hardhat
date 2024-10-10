// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { StdAssertions } from "forge-std/src/StdAssertions.sol";
import { StdCheats } from "forge-std/src/StdCheats.sol";
import { Vm } from "forge-std/src/Vm.sol";

import { PRBMathAssertions } from "./utils/Assertions.sol";
import { PRBMathUtils } from "./utils/Utils.sol";

/// @notice Base test contract with common logic needed by all tests.
abstract contract Base_Test is StdAssertions, StdCheats, PRBMathAssertions, PRBMathUtils {
    /*//////////////////////////////////////////////////////////////////////////
                                       STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    struct Users {
        address alice;
        address bob;
        address eve;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    CHEATCODES
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev An instance of the Foundry VM, which contains cheatcodes for testing.
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /*//////////////////////////////////////////////////////////////////////////
                                     CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    int256 internal constant MAX_INT256 = type(int256).max;

    uint128 internal constant MAX_UINT128 = type(uint128).max;

    uint128 internal constant MAX_UINT40 = type(uint40).max;

    int256 internal constant MIN_INT256 = type(int256).min;

    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    Users internal users;

    /*//////////////////////////////////////////////////////////////////////////
                                   SET-UP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/

    function setUp() public virtual {
        // Create users for testing.
        users = Users({ alice: makeAddr("Alice"), bob: makeAddr("Bob"), eve: makeAddr("Eve") });

        // Make Alice the `msg.sender` and `tx.origin` for all subsequent calls.
        vm.startPrank({ msgSender: users.alice, txOrigin: users.alice });
    }
}
