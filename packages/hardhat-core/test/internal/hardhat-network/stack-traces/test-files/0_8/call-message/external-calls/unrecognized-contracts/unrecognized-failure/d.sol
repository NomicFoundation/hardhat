pragma solidity ^0.8.0;

contract IgnoredD {

  function fail() public returns (uint) {
    revert("IngoredD failed");
  }

}
