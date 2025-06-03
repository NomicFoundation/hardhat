// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

  constructor() {}

  function doNotEmit() public {}

  function emitWithoutArgs() public {
    emit WithoutArgs();
  }

  function emitInt(int i) public {
    emit WithIntArg(i);
  }

  function emitTwoUints(uint u, uint v) public {
    emit WithTwoUintArgs(u, v);
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
}
