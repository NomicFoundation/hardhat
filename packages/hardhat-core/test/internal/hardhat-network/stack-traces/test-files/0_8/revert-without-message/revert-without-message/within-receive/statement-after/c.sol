pragma solidity ^0.8.0;

contract C {

  uint i = 0;

  receive() external  payable {


    // always true, used to prevent optimizations
    if (msg.value == 0) {
      revert();
    }
    i += 1;
  }

}
