pragma solidity ^0.4.21;

contract Greeter {

    string private constant greeting = "Hello, buidler!";

    function greet() public view returns (string) {
        return greeting;
    }

}