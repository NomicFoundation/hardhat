pragma solidity ^0.8.0;

contract D {
    constructor() m public {

    }

    modifier m {
        revert("D.m failed");
        _;
    }
}
