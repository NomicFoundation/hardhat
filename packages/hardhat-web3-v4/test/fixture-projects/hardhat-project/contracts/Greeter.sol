pragma solidity ^0.5.1;

contract Greeter {

    string greeting;

    event GreetingUpdated(string greeting);

    constructor() public {
        greeting = "Hi";
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
        emit GreetingUpdated(_greeting);
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}
