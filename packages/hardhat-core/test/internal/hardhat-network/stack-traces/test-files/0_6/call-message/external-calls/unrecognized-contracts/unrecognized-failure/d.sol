pragma solidity ^0.6.0;

contract IgnoredD {

  function fail() public returns (uint) {
    revert("IngoredD failed");
  }

}
