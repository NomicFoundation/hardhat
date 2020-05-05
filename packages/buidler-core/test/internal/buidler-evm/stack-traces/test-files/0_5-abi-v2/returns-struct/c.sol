pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";

contract C {
  struct MyStruct {
    address a;
  }

  function log() public {
    MyStruct memory ms = getStruct();
    console.log(ms.a);
  }

  function getStruct() public returns (MyStruct memory) {
    return MyStruct(0x0000000000000000000000000000000000000001);
  }
}
