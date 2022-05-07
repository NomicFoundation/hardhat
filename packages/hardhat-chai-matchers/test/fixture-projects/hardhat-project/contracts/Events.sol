// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Events {
  AnotherContract anotherContract;

  event WithoutArgs();
  event WithUintArg(uint u);
  event WithTwoUintArgs(uint u, uint v);
  event WithStringArg(string s);
  event WithTwoStringArgs(string s, string t);
  event WithIndexedStringArg(string indexed s);
  event WithBytesArg(bytes b);
  event WithIndexedBytesArg(bytes indexed b);
  event WithBytes32Arg(bytes32 b);
  event WithIndexedBytes32Arg(bytes32 indexed b);
  event Arrays(uint256[3] value, bytes32[2] encoded);

  constructor (AnotherContract c) {
    anotherContract = c;
  }

  function emitArrays() public {
      emit Arrays(
          [
          uint256(1),
          uint256(2),
          uint256(3)
          ],
          [
          bytes32(0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123),
          bytes32(0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162124)
          ]
      );
  }

  function doNotEmit() public {}

  function emitWithoutArgs() public {
    emit WithoutArgs();
  }

  function emitUint(uint u) public {
    emit WithUintArg(u);
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

  function emitTwoUintsAndTwoStrings(uint u, uint v, string memory s, string memory t) public {
    emit WithTwoUintArgs(u, v);
    emit WithTwoStringArgs(s, t);
  }

  function emitNestedUintFromSameContract(uint u) public {
    emitUint(u);
  }

  function emitNestedUintFromAnotherContract(uint u) public {
    anotherContract.emitUint(u);
  }
}

contract AnotherContract {
  event WithUintArg(uint u);

  function emitUint(uint u) public {
    emit WithUintArg(u);
  }
}
