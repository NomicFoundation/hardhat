pragma solidity >=0.4.21 <0.6.0;



import "./B.sol";

contract A {
   uint256 _var1 = 8 / 4; // -> uint256 _var1 = 8 / 4;
   uint256 _var2 = 2; // -> uint256 _var2 = 2;

   uint256 _var3 = 2 ** 3 + 3.99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999; // -> uint256 _var3 = 2 ** 3 + 4;
   uint256 _var4 = 100; // -> uint256 _var4 = 100;
   string _var5 = foo;
   string _var6 = bar;
}
