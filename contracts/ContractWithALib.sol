pragma solidity ^0.4.0;

import "./L.sol";

// Just a dependency
contract ContractWithALib {
    function f() returns (bool) {
        return L.g() == 234;
    }
}

