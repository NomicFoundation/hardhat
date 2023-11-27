// SPDX-License-Identifier: MPL-2.0

pragma solidity ^0.8.19;

import "./C.sol";

contract B {
    uint public x;

    function inc() public {
        x++;
    }
}
