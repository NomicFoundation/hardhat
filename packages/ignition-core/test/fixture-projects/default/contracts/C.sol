// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Libs.sol" as Libs;

contract D {
  event Event2(uint);

  error CustomError2(uint);

  function fail() public pure {
    revert CustomError2(1);
  }

  function events() public {
    emit Event2(1);
  }
}

contract C {
  event Event(bool);

  error CustomError(uint, bool b);

  D d = new D();

  struct S {
    uint i;
  }

  function returnString() public pure returns (string memory) {
    return "hello";
  }

  function returnNothing() public pure {}

  function revertWithoutReasonClash() public pure {
    revert();
  }

  function revertWithoutReasonWithoutClash() public pure returns (uint256) {
    revert();
  }

  function revertWithReasonMessage() public pure {
    revert("reason");
  }

  function revertWithEmptyReasonMessage() public pure {
    revert("");
  }

  function revertWithInvalidErrorMessage() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"08c379a0123456";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithPanicCode() public pure {
    uint i = 0;
    uint j = 1 / i;
  }

  function revertWithInvalidPanicCode() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"4e487b71123456";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithNonExistentPanicCode() public pure {
    // Returns the error code 0xFF, which doesn't exist
    bytes
      memory x = hex"4e487b7100000000000000000000000000000000000000000000000000000000000000ff";
    assembly {
      revert(add(x, 32), 36)
    }
  }

  function revertWithCustomError() public pure {
    revert CustomError(1, true);
  }

  function revertWithInvalidCustomError() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"659c1f59000000";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithUnknownCustomError() public view {
    d.fail();
  }

  function revertWithInvalidData() public pure returns (uint256) {
    bytes memory x = hex"0123456789abcdef";
    assembly {
      revert(add(x, 32), 2)
    }
  }

  function invalidOpcode() public pure returns (uint256) {
    assembly {
      invalid()
    }
  }

  function invalidOpcodeClash() public pure {
    assembly {
      invalid()
    }
  }

  function withNamedAndUnnamedOutputs()
    public
    pure
    returns (uint, bool b, string memory h)
  {
    return (1, true, "hello");
  }

  function withReturnTypes()
    public
    pure
    returns (
      int8,
      uint8,
      int128,
      uint128,
      bytes10,
      bytes memory,
      uint8[2] memory,
      uint16[] memory
    )
  {
    uint8[2] memory twoUints = [uint8(1), 2];
    uint16[] memory uints = new uint16[](1);
    uints[0] = 123;

    return (
      int8(2),
      uint8(3),
      int128(4),
      uint128(5),
      hex"11",
      hex"AA",
      twoUints,
      uints
    );
  }

  function getStruct() public pure returns (S memory) {
    return S({i: 123});
  }

  function events() public {
    emit Event(true);
    d.events();
  }
}

contract WithComplexDeploymentArguments {
  struct S {
    uint i;
  }

  constructor(S memory s) {
    require(s.i == 123);
  }
}

library Lib {
  function f() public pure returns (uint) {
    return 1;
  }
}

contract WithLibrary {
  constructor() {
    require(Lib.f() == 1);
  }
}

contract WithAmbiguousLibraryName {
  constructor() {
    require(Lib.f() == 1);
    require(Libs.Lib.g() == 2);
  }
}

contract WithComplexArguments {
  struct S {
    uint i;
  }

  function foo(
    S memory s,
    bytes32 b32,
    bytes memory b,
    string[] memory ss
  ) public pure returns (S memory, bytes32, bytes memory, string[] memory) {
    return (s, b32, b, ss);
  }
}

contract ToTestEthersEncodingConversion {
  struct S {
    uint i;
  }

  function numberTypes(
    uint8 a,
    int8 b,
    uint32 c,
    int32 d,
    uint128 e,
    int128 f,
    uint g,
    int h
  )
    public
    pure
    returns (uint8, int8, uint32, int32, uint128, int128, uint, int)
  {
    return (a, b, c, d, e, f, g, h);
  }

  function booleans(bool a, bool b) public pure returns (bool, bool f) {
    return (a, b);
  }

  function byteArrays(
    bytes10 b10,
    bytes memory bs
  ) public pure returns (bytes10, bytes memory) {
    return (b10, bs);
  }

  function strings(string memory s) public pure returns (string memory) {
    return s;
  }

  function structs(S memory s) public pure returns (S memory) {
    return s;
  }

  function arrays(
    uint[] memory uis,
    string[] memory ss,
    int[10] memory ints
  ) public pure returns (uint[] memory, string[] memory, int[10] memory) {
    return (uis, ss, ints);
  }

  function addresses(address addy) public pure returns (address) {
    return addy;
  }

  function tuple(uint8 u, uint16 u2) public pure returns (uint8, uint16 named) {
    return (u, u2);
  }

  function recursiveApplication(
    S[] memory ss,
    S[][] memory sss
  ) public pure returns (S[] memory, S[][] memory) {
    return (ss, sss);
  }
}

contract FunctionNameValidation {
  struct S {
    uint i;
    uint32 j;
    string s;
  }

  function noOverloads() public pure {}

  function withTypeBasedOverloads(uint u) public pure {}

  function withTypeBasedOverloads(int i) public pure {}

  function withParamCountOverloads() public pure {}

  function withParamCountOverloads(int i) public pure {}

  function _$_weirdName() public pure {}

  function $_weirdName2() public pure {}

  function complexTypeOverload() public pure {}

  function complexTypeOverload(S[] memory ss) public pure {}
}
