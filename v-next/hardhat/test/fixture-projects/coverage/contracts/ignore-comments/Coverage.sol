// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    //
    // Attention:
    // Do not autoformat on save in order to keep this specific formatting
    //

    uint256 a = n; // Comment after code, line should included in coverage

    /* These lines should be ignored for coverage purposes
    * comment
    *comment
     comment*/

    /*
     * These lines should be ignored for coverage purposes
     */

    a = n; /* Comment after code, line should included in coverage
    Comment before code, line should included in coverage */ a = n;

    return a;
  }
}
