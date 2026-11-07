// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// A path import with no braces re-exports whatever it imports, so a file
// importing this one reaches `Clash` without naming `Clash.sol` itself.
import "./Clash.sol";
