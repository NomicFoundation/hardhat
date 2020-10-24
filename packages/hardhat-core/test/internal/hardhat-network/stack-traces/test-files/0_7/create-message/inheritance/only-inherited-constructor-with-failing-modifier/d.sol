pragma solidity ^0.7.0;

contract D {
    constructor() m public {

    }

    modifier m {
        revert("D.m failed");
        _;
    }
}
