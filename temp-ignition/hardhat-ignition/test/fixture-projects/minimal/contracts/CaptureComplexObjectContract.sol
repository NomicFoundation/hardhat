// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract CaptureComplexObjectContract {
  bool public complexArgCaptured;

  constructor() {
    complexArgCaptured = false;
  }

  struct SubComplex {
    string sub;
  }

  struct Complex {
    bool firstBool;
    uint256[] secondArray;
    SubComplex thirdSubcomplex;
  }

  function testComplexObject(
    Complex memory complexArg
  ) public returns (uint256 output) {
    complexArgCaptured = true;

    require(complexArg.firstBool, "bad first bool");

    require(complexArg.secondArray.length == 3, "bad second array");
    require(complexArg.secondArray[0] == 1, "First value is wrong");
    require(complexArg.secondArray[1] == 2, "Second value is wrong");
    require(complexArg.secondArray[2] == 3, "Third value is wrong");

    require(
      keccak256(abi.encodePacked(complexArg.thirdSubcomplex.sub)) ==
        keccak256(abi.encodePacked("sub")),
      "The complex sub object property is wrong"
    );

    return 1;
  }
}
