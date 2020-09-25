pragma solidity ^0.5.0;

contract D {
    constructor(bool b) public {
    }
}

contract E {
    constructor(bool b) public {
        fail(b);
    }

    function fail(bool b) public {
        require(b);
    }
}
