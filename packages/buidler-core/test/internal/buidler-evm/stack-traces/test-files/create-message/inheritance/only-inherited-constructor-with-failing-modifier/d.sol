pragma solidity ^0.5.0;

contract D {
    constructor() m public {

    }

    modifier m {
        revert("D.m failed");
        _;
    }
}
