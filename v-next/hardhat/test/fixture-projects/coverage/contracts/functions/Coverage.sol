// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure {
    runNumber2(n);

    runNumber3(n);
  }

  function runNumber2(uint256 n) public pure {
    if (n == 200) {
      return;
    }

    return;
  }

  function runNumber3(uint256 n) public pure {
    if (n == 4) {
      return;
    }

    return;
  }
}
