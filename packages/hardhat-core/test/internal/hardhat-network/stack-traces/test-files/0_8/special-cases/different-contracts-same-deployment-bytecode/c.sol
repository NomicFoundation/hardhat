pragma solidity ^0.8.0;

import "./d.sol";

contract E {
    constructor() public {
        revert("E");
    }
}


contract C is D, E {
    constructor() public {
        revert("C and D have the same deployment bytecode because they always fail and get recognized as D");
    }

}

