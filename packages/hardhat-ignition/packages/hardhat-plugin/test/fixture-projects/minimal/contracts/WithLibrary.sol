// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

library RubbishMath {
  function add(uint16 left, uint16 right) public pure returns (uint16) {
    return left + right;
  }
}

contract DependsOnLib {
  function addThreeNumbers(
    uint16 first,
    uint16 second,
    uint16 third
  ) public pure returns (uint16) {
    return RubbishMath.add(first, RubbishMath.add(second, third));
  }
}

library LibDependsOnLib {
  function add(uint16 left, uint16 right) public pure returns (uint16) {
    return RubbishMath.add(left, right);
  }
}

contract DependsOnLibThatDependsOnLib {
  function addThreeNumbers(
    uint16 first,
    uint16 second,
    uint16 third
  ) public pure returns (uint16) {
    return LibDependsOnLib.add(first, LibDependsOnLib.add(second, third));
  }
}
