pragma solidity ^0.7.0;

contract D {
    constructor() m public {

    }

    modifier m {
        _;
        fail();
    }

    function fail() internal {
        revert("fail");
    }
}
