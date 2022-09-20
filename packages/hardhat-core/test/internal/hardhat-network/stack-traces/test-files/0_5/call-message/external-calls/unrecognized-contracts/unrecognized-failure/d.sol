pragma solidity ^0.5.0;

contract IgnoredD {

  function fail() public returns (uint) {
    revert("IngoredD failed");
  }

}
