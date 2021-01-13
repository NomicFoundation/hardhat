pragma solidity ^0.7.0;

library Lib {
  function inc(uint256 x) pure public returns(uint256) {
    require(x > 0, "Increment cannot be zero");
    return x + 1;
  }
}
