pragma solidity ^0.5.3;

// #buidler-autoexternal

contract A {

    function _exportedInternalFunctionWithSingleReturnValue() pure internal returns (uint256) 
    {
        return 123;
    
}
