pragma solidity >=0.4.21 <0.6.0;

contract B {
   function bar(uint256 x) pure returns (uint256) {
     // Repeat code with a for loop.
     return x /* #for V in range(1,4) */+ $$(V+1)/* #done */; // -> return x + 1 + 2 + 3;
   }
}



