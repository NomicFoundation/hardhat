// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

// CREATE-time revert via internal helper. Exercises solx DWARF for the
// CREATE bytecode (evm.bytecode.debugInfo).
contract ConstructorRevert {
    function _check(uint256 v) internal pure {
        require(v > 0, "constructor helper boom");
    }

    constructor(uint256 v) {
        _check(v);
    }
}
