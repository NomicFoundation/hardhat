// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Revert {
  function alwaysRevert() external pure {
    revert("Intentional revert for testing purposes");
  }

  function doNotRevert() external pure {}
}
