pragma solidity ^0.5.0;

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
