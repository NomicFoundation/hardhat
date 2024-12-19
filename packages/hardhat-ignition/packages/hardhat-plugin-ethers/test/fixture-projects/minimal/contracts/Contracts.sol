// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract Foo {
  bool public isFoo = true;
  uint256 public x = 1;

  function inc() public {
    x++;
  }

  function incByPositiveNumber(uint256 n) public {
    require(n > 0, "n must be positive");
    x += n;
  }

  function incTwoNumbers(uint256 first, uint256 second) public {
    x += first;
    x += second;
  }
}

contract Bar {
  bool public isBar = true;
}

contract UsesContract {
  address public contractAddress;

  constructor(address _contract) {
    contractAddress = _contract;
  }

  function setAddress(address _contract) public {
    contractAddress = _contract;
  }
}

contract Greeter {
  string private _greeting;

  constructor(string memory greeting) {
    _greeting = greeting;
  }

  function getGreeting() public view returns (string memory) {
    return _greeting;
  }
}

contract StaticCallValue {
  function getValue() public pure returns (uint256) {
    return 42;
  }
}

contract EventArgValue {
  event EventValue(uint256 value);

  constructor() {
    emit EventValue(42);
  }
}

contract PassingValue {
  constructor() payable {}

  function deposit() public payable {}
}

contract TupleReturn {
  bool public arg1Captured;
  bool public arg2Captured;

  function getTuple() public pure returns (bool arg1, uint256 arg2) {
    return (true, 1234);
  }

  function verifyArg1(bool arg) public returns (uint256 output) {
    arg1Captured = true;

    require(arg == true, "arg1 is wrong");

    return 1;
  }

  function verifyArg2(uint256 arg) public returns (uint256 output) {
    arg2Captured = true;

    require(arg == 1234, "arg2 is wrong");

    return 1;
  }
}

contract TupleEmitter {
  bool public arg1Captured;
  bool public arg2Captured;

  event TupleEvent(bool arg1, uint256 arg2);

  function emitTuple() public {
    emit TupleEvent(true, 1234);
  }

  function verifyArg1(bool arg) public returns (uint256 output) {
    arg1Captured = true;

    require(arg == true, "arg1 is wrong");

    return 1;
  }

  function verifyArg2(uint256 arg) public returns (uint256 output) {
    arg2Captured = true;

    require(arg == 1234, "arg2 is wrong");

    return 1;
  }
}

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

contract SendDataEmitter {
  event SendDataEvent(bool arg);

  bool public wasEmitted;

  receive() external payable {
    emit SendDataEvent(true);
  }

  function validateEmitted(bool arg) public {
    wasEmitted = true;

    require(arg == true, "arg is wrong");
  }
}

contract OwnerSender {
  address public owner;

  constructor() {
    owner = msg.sender;
  }
}
