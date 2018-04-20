pragma solidity ^0.4.0;

// Just a dependency
contract ContractWithALib {
    function f() returns (bool) {
        return L.g() == 234;
    }
}

library L {
    function g() returns (uint256) {
        return 123;
    }
}