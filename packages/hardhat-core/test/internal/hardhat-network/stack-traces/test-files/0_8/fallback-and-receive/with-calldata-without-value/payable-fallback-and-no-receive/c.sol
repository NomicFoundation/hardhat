pragma solidity ^0.8.0;

contract C {

  fallback () external payable {
    revert('fallback failed');
  }

}

