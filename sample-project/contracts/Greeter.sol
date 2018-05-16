pragma solidity ^0.4.21;

contract Greeter {

    string private constant greeting = "Hello, buidler!";

    function greet() public pure returns (string) {
        return greeting;
    }

}