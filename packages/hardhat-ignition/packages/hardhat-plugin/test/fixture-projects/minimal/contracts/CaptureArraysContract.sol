// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract CaptureArraysContract {
  bool public arraysCaptured;

  constructor() {
    arraysCaptured = false;
  }

  function recordArrays(
    uint256[] memory first,
    string[] memory second,
    bool[] memory third
  ) public returns (uint256 output) {
    arraysCaptured = true;

    require(first.length == 3, "Wrong number of args on first arg");
    require(first[0] == 1, "First value is wrong");
    require(first[1] == 2, "Second value is wrong");
    require(first[2] == 3, "Third value is wrong");

    require(second.length == 3, "Wrong number of args on second arg");
    require(
      keccak256(abi.encodePacked(second[0])) ==
        keccak256(abi.encodePacked("a")),
      "First value is wrong"
    );
    require(
      keccak256(abi.encodePacked(second[1])) ==
        keccak256(abi.encodePacked("b")),
      "Second value is wrong"
    );
    require(
      keccak256(abi.encodePacked(second[2])) ==
        keccak256(abi.encodePacked("c")),
      "Third value is wrong"
    );

    require(third.length == 3, "Wrong number of args on third arg");
    require(third[0] == true, "First value is wrong");
    require(third[1] == false, "Second value is wrong");
    require(third[2] == true, "Third value is wrong");

    return 1;
  }
}
