// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./Contracts.sol";

contract FooFactory {
  event Deployed(address indexed fooAddress);

  function create() public {
    Foo foo = new Foo();

    emit Deployed(address(foo));
  }

  function isDeployed() public pure returns (bool output) {
    return true;
  }
}
