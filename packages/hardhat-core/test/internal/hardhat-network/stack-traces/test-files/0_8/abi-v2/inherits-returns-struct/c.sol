pragma solidity ^0.8.0;


import "./../../../../../../../../console.sol";
import "./d.sol";

contract C is D {
  function test() public override returns (MyStruct[] memory) {
    MyStruct[] memory structs = super.test();
    console.log(structs[1].x);
    return structs;
  }
}
