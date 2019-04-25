pragma solidity ^0.5.3;

// #annotation

contract A {

    modifier mod(uint256 arg) {
        _;
    }

    function _exportedInternalFunction(uint104 i, bool _b, int16 asd) internal mod(123) returns (uint104 a, uint112 b) {
        return (1, 2);
    }

    function _exportedInternalFunctionWithSingleReturnValue() pure internal returns (uint256) 
    {
        return 123;
    }
}
