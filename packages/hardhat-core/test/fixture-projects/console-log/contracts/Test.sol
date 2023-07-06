//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "hardhat/console.sol";

contract Test {
  function test() public view {
    console.log("%d", 123456789123456789123456789);
    console.log("%i", 123456789123456789123456789);
    console.log("%d%i%s", 12, 13, 14);
    console.log("%d", 1, "%i", 1);
    console.log("%d %%d %%%d %%%%d %%%%%d %%%%%%d", 1, 2, 3);
    console.log("%i %%i %%%i %%%%i %%%%%i %%%%%%i", 1, 2, 3);
    console.log("%s %%s %%%s %%%%s %%%%%s %%%%%%s", 1, 2, 3);
  }
}
