// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Calculator {
    uint256 public result;
    uint256 public lastOperation;

    event Operation(string op, uint256 a, uint256 b, uint256 result);

    function add(uint256 a, uint256 b) public returns (uint256) {
        result = a + b;
        lastOperation = result;
        emit Operation("add", a, b, result);
        return result;
    }

    function subtract(uint256 a, uint256 b) public returns (uint256) {
        require(a >= b, "Calculator: subtraction underflow");
        result = a - b;
        lastOperation = result;
        emit Operation("subtract", a, b, result);
        return result;
    }

    function multiply(uint256 a, uint256 b) public returns (uint256) {
        result = a * b;
        lastOperation = result;
        emit Operation("multiply", a, b, result);
        return result;
    }

    function divide(uint256 a, uint256 b) public returns (uint256) {
        require(b != 0, "Calculator: division by zero");
        result = a / b;
        lastOperation = result;
        emit Operation("divide", a, b, result);
        return result;
    }

    function reset() public {
        result = 0;
        lastOperation = 0;
    }
}
