pragma solidity ^0.7.0;

contract D {
    constructor(bool b) public {
    }
}

contract E {
    constructor(bool b) public {
        require(b, "");
    }
}
