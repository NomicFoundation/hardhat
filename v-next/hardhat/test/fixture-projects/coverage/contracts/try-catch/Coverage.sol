// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public view returns (uint256) {
    uint256 result;

    try this.divideByZero(n) returns (uint256) {
      return result;
    } catch {
      result = 0;
    }

    try this.divideBy2(n) returns (uint256) {
      return result;
    } catch Error(string memory) {
      return 0;
    }
  }

  function divideByZero(uint256 n) public pure returns (uint256) {
    return n / (n - n); // Trigger error
  }

  function divideBy2(uint256 n) public pure returns (uint256) {
    return n / 2;
  }
}
