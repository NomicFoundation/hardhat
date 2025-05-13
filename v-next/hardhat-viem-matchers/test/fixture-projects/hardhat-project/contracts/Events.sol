// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Events {
  event WithoutArgs();
  event WithIntArg(int i);
  event WithTwoUintArgs(uint u, uint v);

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
}
