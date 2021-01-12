// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.3;


contract EventTest {

    uint256 public aNumber;

    event NumberSet(uint256 theNewNumber);

    constructor(uint256 someNumber) {
        setTheNumber(someNumber + 10);
    }

    function setTheNumber(uint256 aNewNumber) public {
        aNumber = aNewNumber;
        emit NumberSet(aNewNumber);
    }
}