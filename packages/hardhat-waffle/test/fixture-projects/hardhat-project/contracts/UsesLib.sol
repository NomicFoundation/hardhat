pragma solidity ^0.7.0;

import "./Lib.sol";

contract UsesLib {
  using Lib for uint256;

  function nPlusOne(uint n) public pure returns (uint) {
    return n.inc();
  }
}
