// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public view returns (uint8) {
    //
    // Attention:
    // Do not autoformat on save in order to keep this specific formatting
    //

    uint256 result = 0;

    //
    // if-else
    //
    if (n == 0)
    {

      result = 1;

    }
    else
    {

      result = 2;

    }

    //
    // try-catch
    //
    try
      this.willRevertWithError(n)
     returns (uint256)
     {


      result = 1;

    }
    catch
    Error(string memory reason)
    {
      result = 2;

    }


    //
    // Loops
    //
    for

    (uint256 i = 0; i < n; i++)
    {
      result += i;
    }

    uint256 i = 0;
    while

    (i < n)
    {
      result += i;
      i++;
    }

    do

    {
      result += i;
      i++;
    }
    while
    (i < n)
    ;

  }

    function willRevertWithError(
      uint256 n
    ) public pure
    returns (uint256) {
    // This will trigger Error(string)
    require(n == 1000, "Invalid check");
    return 42;
  }
}
