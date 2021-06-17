pragma solidity ^0.8.0;

contract C {
  function test() public returns (bytes memory) {
    uint256 l = 2**256 / 32;
    uint256[] memory x = new uint256[](l);
  }
}
