// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./Foo.sol";

contract FooFactory {
  event Deployed(address indexed fooAddress);

  address public deployed;
  address[] public allDeployed;

  bool public nonAddressResult;

  function create() public {
    Foo foo = new Foo();

    deployed = address(foo);
    allDeployed.push(address(foo));

    emit Deployed(address(foo));
  }

  function isDeployed() public pure returns (bool output) {
    return true;
  }

  function getDeployed() public view returns (address output) {
    return allDeployed[0];
  }

  function getDeployed(uint256 value) public view returns (address output) {
    return allDeployed[value];
  }
}
