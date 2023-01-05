pragma solidity ^0.5.1;

import "./Greeter.sol";

contract GreeterWithConstructorArg is Greeter {
    constructor(string memory initialString) public {
        greeting = initialString;
    }
}
