// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract GenericReverter {
    error GenericError(address account);

    function check(address account) external pure returns (bool) {
        require(false, GenericError(account));
        return true;
    }

    function doNotRevert() external pure returns (bool) {
        return true;
    }
}
