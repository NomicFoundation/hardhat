pragma solidity ^0.4.21;

contract Greeter {

    string greeting;

    function Greeter(string _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string) {
        return greeting;
    }

}