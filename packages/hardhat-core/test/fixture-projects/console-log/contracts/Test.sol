//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "hardhat/console.sol";

contract Test {
  uint n1 = 11111111111111111111111111111111;
  uint n2 = 22222222222222222222222222222222;
  uint n3 = 33333333333333333333333333333333;

  function test() public view {
    console.log("%d", 123456789123456789123456789);
    console.log("%i", 123456789123456789123456789);
    console.log("%d%i%s", n1, n2, n3);
    console.log("%d", n1, "%i", n1);
    console.log("%d %%d %%%d %%%%d %%%%%d %%%%%%d", n1, 2, n3);
    console.log("%i %%i %%%i %%%%i %%%%%i %%%%%%i", n1, 2, n3);
    console.log("%s %%s %%%s %%%%s %%%%%s %%%%%%s", n1, 2, n3);
    console.log("%d");
    console.log("%%d");
    console.log("%s");
    console.log("%d %i %s %%d");
    console.log("1111111111111111114444444444444444444455555555555555555555");
    console.log(1);
    console.log("%d", 12);
    console.log("%i", 13);
  }
}
