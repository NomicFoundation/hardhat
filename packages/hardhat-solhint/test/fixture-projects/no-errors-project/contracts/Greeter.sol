pragma solidity ^0.8.28;


contract Greeter {

    string greeting;
    constructor(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}
