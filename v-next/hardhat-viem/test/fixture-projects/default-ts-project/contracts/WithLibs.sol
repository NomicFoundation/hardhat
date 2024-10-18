// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import {ConstructorLib as ExternalConstructorLib} from "./ConstructorLib.sol";

library NormalLib {
  function libDo(uint256 n) external pure returns (uint256) {
    return n * 2;
  }
}

library ConstructorLib {
  function libDo(uint256 n) external pure returns (uint256) {
    return n * 4;
  }
}

contract OnlyNormalLib {
  string message = "placeholder1";

  constructor() {}

  function getNumber(uint256 aNumber) public pure returns (uint256) {
    return NormalLib.libDo(aNumber);
  }
}

contract OnlyConstructorLib {
  uint256 public someNumber;
  string message = "placeholder2";

  constructor(uint256 aNumber) {
    someNumber = ConstructorLib.libDo(aNumber);
  }

  function getNumber() public view returns (uint256) {
    return someNumber;
  }
}

contract BothLibs {
  uint256 public someNumber;
  string message = "placeholder3";

  constructor(uint256 aNumber) {
    someNumber = ConstructorLib.libDo(aNumber);
  }

  function getNumber(uint256 aNumber) public pure returns (uint256) {
    return NormalLib.libDo(aNumber);
  }

  function getNumber() public view returns (uint256) {
    return someNumber;
  }
}

contract BothConstructorLibs {
  uint256 public someNumber;
  string message = "placeholder4";

  constructor(uint256 aNumber) {
    someNumber = ExternalConstructorLib.libDo(ConstructorLib.libDo(aNumber));
  }

  function getNumber() public view returns (uint256) {
    return someNumber;
  }
}
