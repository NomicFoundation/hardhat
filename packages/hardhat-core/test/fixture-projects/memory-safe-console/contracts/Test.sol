//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.18;

import "hardhat/console.sol";

// this file won't compile if viaIR is enabled and `console.sol` is not memory-safe
contract Test {
    function logSum(uint256 arg0, uint256 arg1, uint256 arg2, uint256 arg3, uint256 arg4, uint256 arg5, uint256 arg6, uint256 arg7, uint256 arg8, uint256 arg9, uint256 arg10, uint256 arg11, uint256 arg12, uint256 arg13, uint256 arg14, uint256 arg15, uint256 arg16) public view {
        console.log(arg0 + arg1 + arg2 + arg3 + arg4 + arg5 + arg6 + arg7 + arg8 + arg9 + arg10 + arg11 + arg12 + arg13 + arg14 + arg15 + arg16);
    }
}
