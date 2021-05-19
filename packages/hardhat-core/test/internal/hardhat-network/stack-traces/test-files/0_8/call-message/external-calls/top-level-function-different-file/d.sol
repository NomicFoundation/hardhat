pragma solidity ^0.8.1;

function fail() returns (uint) {
  require(false, "top-level function failed");
  return 0;
}
