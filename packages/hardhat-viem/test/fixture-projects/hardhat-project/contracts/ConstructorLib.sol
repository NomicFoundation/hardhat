// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

library ConstructorLib {
    function libDo(uint256 n) pure external returns (uint256) {
        return n * n;
    }
}
