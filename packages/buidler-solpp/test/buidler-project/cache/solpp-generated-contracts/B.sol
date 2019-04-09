pragma solidity >=0.4.21 <0.6.0;

contract B {
   function bar(uint256 x) pure returns (uint256) {
     // Repeat code with a a for loop.
     return x + 2+ 3+ 4; // -> return x + 1 + 2 + 3;
   }
}