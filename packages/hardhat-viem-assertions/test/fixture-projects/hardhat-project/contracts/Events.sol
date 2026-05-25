// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct TestStruct {
  uint a;
  uint b;
}

contract Events {
  event WithoutArgs();
  event WithIntArg(int i);
  event WithTwoUintArgs(uint u, uint v);
  event WithTwoUintArgsNoParamName(uint, uint);
  event WithTwoUintArgsMixedParamName(uint u, uint);
  event SameEventDifferentArgs(uint u);
  event SameEventDifferentArgs(uint u, uint v);
  event SameEventDifferentArgs(uint u, string s);
  event SameEventDifferentArgs(uint u, uint v, string s);
  event WithString(string s);
  event WithArray(uint[] a);
  event WithStruct(TestStruct a);
  event WithAddress(address a);

  constructor() {}

  function doNotEmit() public {}

  function reverts() public {
    revert("Intentional revert for testing purposes");
  }

  function emitWithoutArgs() public {
    emit WithoutArgs();
  }

  function emitInt(int i) public {
    emit WithIntArg(i);
  }

  function emitTwoUints(uint u, uint v) public {
    emit WithTwoUintArgs(u, v);
  }

  function emitMultipleTwoUints() public {
    emit WithoutArgs();
    emit WithTwoUintArgs(1, 2);
    emit WithTwoUintArgs(3, 4);
    emit WithTwoUintArgs(5, 6);
    emit WithoutArgs();
  }

  function emitTwoUintsNoParamName(uint u, uint v) public {
    emit WithTwoUintArgsNoParamName(u, v);
  }

  function emitTwoUintsMixedParamName(uint u, uint v) public {
    emit WithTwoUintArgsMixedParamName(u, v);
  }

  function emitSameEventDifferentArgs1(uint u) public {
    emit SameEventDifferentArgs(u);
  }

  function emitSameEventDifferentArgs2(uint u, string memory s) public {
    emit SameEventDifferentArgs(u, s);
  }

  function emitSameEventDifferentArgs3(uint u, uint v, string memory s) public {
    emit SameEventDifferentArgs(u, v, s);
  }

  function emitString(string memory s) public {
    emit WithString(s);
  }

  function emitArray(uint[] memory a) public {
    emit WithArray(a);
  }

  function emitStruct(TestStruct memory a) public {
    emit WithStruct(a);
  }

  function emitAddress(address a) public {
    emit WithAddress(a);
  }
}
