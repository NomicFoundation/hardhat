pragma solidity ^0.6.0;

contract D {
    constructor(bool b) public {
    }
}

contract E {
    constructor(bool b) public {
        require(b, "");
    }
}
