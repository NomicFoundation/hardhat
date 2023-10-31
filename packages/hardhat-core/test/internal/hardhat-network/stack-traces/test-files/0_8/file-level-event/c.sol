// SPDX-License-Identifier: UNLICENSED

// LogFileEvent is available ONLY from versions >= 0.8.22.
// Smoke test to check that 0.8.22 is setup correctly.

pragma solidity ^0.8.22;

// File-level event definition
event LogFileEvent();

contract C {
    function f() public {
        emit LogFileEvent();
        require(false, "error reason");
    }
}
