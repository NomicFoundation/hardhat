// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public view returns (uint256) {
    //
    // Attention:
    // Do not autoformat on save in order to keep this specific formatting
    //

    uint256 result;

    try this.divideByZero(n) returns (uint256) {
      return result;
    } catch {
      result = 0;
    }

    try this.willRevertWithError(n) returns (uint256) {
      return result;
    } catch Error(string memory reason) {
      result = 0;
    }

    try this.willRevertWithError(n) returns (uint256) {
      return result;
    } catch
    Error(string memory reason)
    {
      result = 0;
    }

    try this.divideBy2(n) returns (uint256) {
      return result;
    } catch {
      return 0;
    }
  }

  function divideByZero(uint256 n) public pure returns (uint256) {
    return n / (n - n); // Trigger error
  }

  function willRevertWithError(uint256 n) public pure returns (uint256) {
    // This will trigger Error(string)
    require(n == 1000, "Invalid check");
    return 42;
  }

  function divideBy2(uint256 n) public pure returns (uint256) {
    return n / 2;
  }
}
