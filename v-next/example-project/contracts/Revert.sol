// SPDX-License-Identifier: UNLICENSED
// NOTE: Do not change this file, as its content is used in the tests.
// Once we improve the EDR integration tests we should remove this file.
pragma solidity ^0.8.0;
pragma solidity *;

contract Revert {
  function boom() public pure {
    foo();
  }

  function foo() internal pure {
    revert("Boom");
  }
}
