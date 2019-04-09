pragma solidity >=0.4.21 <0.6.0;

import "./B.sol";

contract A {
   // #def EIGHT_QUARTERS 8 / 4
   uint256 _var1 = $(EIGHT_QUARTERS); // -> uint256 _var1 = 8 / 4;
   uint256 _var2 = $$(EIGHT_QUARTERS); // -> uint256 _var2 = 2;

   // #def POW(a, b) a ** b
   uint256 _var3 = $(POW(2, 3)) + $$(POW(16, 0.5)); // -> uint256 _var3 = 2 ** 3 + 4;
   // #def SQUARE(x) POW(x, 2)
   uint256 _var4 = $$(SQUARE(10)); // -> uint256 _var4 = 100;
   string _var5 = $$(foo);
   string _var6 = $(bar);
}
