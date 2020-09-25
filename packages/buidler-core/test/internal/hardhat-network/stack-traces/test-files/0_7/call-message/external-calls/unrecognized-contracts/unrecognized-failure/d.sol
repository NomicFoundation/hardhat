pragma solidity ^0.7.0;

contract IgnoredD {

  function fail() public returns (uint) {
    revert("IngoredD failed");
  }

}
