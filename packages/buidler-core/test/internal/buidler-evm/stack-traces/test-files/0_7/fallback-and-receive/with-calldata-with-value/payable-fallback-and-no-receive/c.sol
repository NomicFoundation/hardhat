pragma solidity ^0.7.0;

contract C {

  fallback () external payable {
    revert('fallback failed');
  }

}

