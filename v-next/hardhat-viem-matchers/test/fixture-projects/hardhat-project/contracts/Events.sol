// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Events {
  struct Struct {
    uint u;
    uint v;
  }

  event WithoutArgs();
  event WithUintArg(uint u);
  event WithIntArg(int i);
  event WithAddressArg(address a);
  event WithTwoUintArgs(uint u, uint v);
  event WithStringArg(string s);
  event WithTwoStringArgs(string s, string t);
  event WithIndexedStringArg(string indexed s);
  event WithBytesArg(bytes b);
  event WithIndexedBytesArg(bytes indexed b);
  event WithBytes32Arg(bytes32 b);
  event WithStructArg(Struct s);
  event WithIndexedBytes32Arg(bytes32 indexed b);
  event WithUintArray(uint[2] a);
  event WithBytes32Array(bytes32[2] a);

  constructor() {}

  function doNotEmit() public {}

  function emitWithoutArgs() public {
    emit WithoutArgs();
  }

  function emitUint(uint u) public {
    emit WithUintArg(u);
  }

  function emitInt(int i) public {
    emit WithIntArg(i);
  }

  function emitAddress(address a) public {
    emit WithAddressArg(a);
  }

  function emitUintTwice(uint u, uint v) public {
    emit WithUintArg(u);
    emit WithUintArg(v);
  }

  function emitTwoUints(uint u, uint v) public {
    emit WithTwoUintArgs(u, v);
  }

  function emitString(string memory s) public {
    emit WithStringArg(s);
  }

  function emitIndexedString(string memory s) public {
    emit WithIndexedStringArg(s);
  }

  function emitBytes(bytes memory b) public {
    emit WithBytesArg(b);
  }

  function emitIndexedBytes(bytes memory b) public {
    emit WithIndexedBytesArg(b);
  }

  function emitBytes32(bytes32 b) public {
    emit WithBytes32Arg(b);
  }

  function emitIndexedBytes32(bytes32 b) public {
    emit WithIndexedBytes32Arg(b);
  }

  function emitUintAndString(uint u, string memory s) public {
    emit WithStringArg(s);
    emit WithUintArg(u);
  }

  function emitTwoUintsAndTwoStrings(
    uint u,
    uint v,
    string memory s,
    string memory t
  ) public {
    emit WithTwoUintArgs(u, v);
    emit WithTwoStringArgs(s, t);
  }

  function emitStruct(uint u, uint v) public {
    emit WithStructArg(Struct(u, v));
  }

  function emitUintArray(uint u, uint v) public {
    emit WithUintArray([u, v]);
  }

  function emitBytes32Array(bytes32 b, bytes32 c) public {
    emit WithBytes32Array([b, c]);
  }

  function emitNestedUintFromSameContract(uint u) public {
    emitUint(u);
  }
}

contract AnotherContract {
  event WithUintArg(uint u);

  function emitUint(uint u) public {
    emit WithUintArg(u);
  }
}

contract OverrideEventContract {
  event simpleEvent(uint u);
  event simpleEvent();

  function emitSimpleEventWithUintArg(uint u) public {
    emit simpleEvent(u);
  }

  function emitSimpleEventWithoutArg() public {
    emit simpleEvent();
  }
}
