pragma solidity ^0.5.1;

contract Greeter {

    string greeting;

    constructor() public {
        greeting = "Hi";
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}

library Lib {

    function addOne(uint256 n) public pure returns (uint256) {
        return n + 1;
    }

}

contract UsesLib {

    uint256 public n;

    function addTwo() public {
        n = Lib.addOne(Lib.addOne(n));
    }

}