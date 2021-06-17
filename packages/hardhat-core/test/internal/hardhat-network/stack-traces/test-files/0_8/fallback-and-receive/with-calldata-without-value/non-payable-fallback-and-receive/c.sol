pragma solidity ^0.8.0;

contract C {

  fallback () external {
    revert('fallback failed');
  }

  receive () external payable {
    revert('receive failed');
  }

}

