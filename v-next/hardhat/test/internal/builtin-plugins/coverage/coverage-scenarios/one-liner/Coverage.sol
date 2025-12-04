// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint8) {
    //
    // Attention:
    // Do not autoformat on save in order to keep this specific formatting
    //

    if (n == 0) { return 0; } else if (n == 1) { return 1; }

    if (n == 3) return 3; else if (n == 4) return 4;

    return (n == 5) ? 5 : 6;
  }
}
