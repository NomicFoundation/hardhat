// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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

  function withNamedAndUnamedOutputs()
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
