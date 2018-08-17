pragma solidity ^0.4.21;

contract Greeter {

    string greeting;

    constructor(string _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string) {
        return greeting;
    }

}
