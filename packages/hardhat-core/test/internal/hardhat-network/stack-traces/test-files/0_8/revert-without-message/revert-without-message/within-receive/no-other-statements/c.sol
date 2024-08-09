pragma solidity ^0.8.0;

contract C {

  receive() external payable {


    // always true, used to prevent optimizations
    if (msg.value == 0) {
      revert();
    }
  }

}
