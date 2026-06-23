// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../lib/forge-std/src/console.sol";

contract ConsoleAddressTest {
  function testConsoleAddressCanBeLinked() public pure {
    address consoleAddress = address(console);

    require(consoleAddress != address(0), "console should be linked");
  }
}
