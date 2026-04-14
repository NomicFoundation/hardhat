// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract Revert {
  function alwaysRevert() external pure {
    revert("Intentional revert for testing purposes");
  }
}
