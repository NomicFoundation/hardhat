// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

// Inline-assembly revert. Sparser DWARF (no per-opcode rows for assembly).
contract InlineAsm {
    function boom() external pure {
        assembly {
            mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
            mstore(0x04, 0x20)
            mstore(0x24, 0x04)
            mstore(0x44, 0x61736d00000000000000000000000000000000000000000000000000000000)
            revert(0x00, 0x64)
        }
    }
}
