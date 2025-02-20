pragma solidity ^0.5.1;


contract Greeter {

    string greeting;
    string bad;
    constructor(string memory _greeting) public {
        greeting = _greeting;
        bad = "baaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad";
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}
