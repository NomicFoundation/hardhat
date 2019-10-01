pragma solidity ^0.5.1;

contract Greeter {

    string greeting;

    constructor(string memory _greeting) public {
        setGreeting(_greeting);
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

}
