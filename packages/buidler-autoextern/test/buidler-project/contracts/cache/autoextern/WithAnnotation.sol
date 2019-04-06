pragma solidity ^0.5.3;

import "../../WithAnnotation.sol";

contract TestableA is A {

  function exportedInternalFunction(uint104 i, bool _b, int16 asd) external mod(123) returns (uint104 a, uint112 b) {
    return super._exportedInternalFunction(i, _b, asd);
  }

  function exportedInternalFunctionWithSingleReturnValue() pure external returns (uint256) 
      {
    return super._exportedInternalFunctionWithSingleReturnValue();
  }

}
