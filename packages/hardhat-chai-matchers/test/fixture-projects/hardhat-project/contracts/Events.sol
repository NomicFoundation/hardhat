// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Events {
  event WithoutArgs();
  event WithUintArg(uint u);
  event WithStringArg(string s);
  event WithIndexedStringArg(string indexed s);
  event WithBytesArg(bytes b);
  event WithIndexedBytesArg(bytes indexed b);
  event One(uint value, string msg, bytes32 encoded);
  event Two(uint indexed value, string msg);
  event Index(string indexed msgHashed, string msg, bytes bmsg, bytes indexed bmsgHash, bytes32 indexed encoded);
  event Arrays(uint256[3] value, bytes32[2] encoded);

  function emitOne() public {
      emit One(1, "One", 0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123);
  }

  function emitOneMultipleTimes() public {
      emit One(1, "One", 0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123);
      emit One(1, "One", 0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123);
      emit One(1, "DifferentKindOfOne", 0x0000000000000000000000000000000000000000000000000000000000000001);
  }

  function emitIndex() public {
    emit Index("Three",
          "Three",
          bytes("Three"),
          bytes("Three"),
          0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123);
  }

  function emitTwo() public {
    emit Two(2, "Two");
  }

  function emitBoth() public {
      emit One(1, "One", 0x0000000000000000000000000000000000000000000000000000000000000001);
      emit Two(2, "Two");
  }

  function _emitInternal() internal {
    emit One(1, "One", 0x00cFBbaF7DDB3a1476767101c12a0162e241fbAD2a0162e2410cFBbaF7162123);
  }
  function emitNested() public {
    _emitInternal();
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

  function emitUintAndString(uint u, string memory s) public {
    emit WithStringArg(s);
    emit WithUintArg(u);
  }
}
