// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract TestContract {
    uint amount;

    string message = "placeholder";

    constructor(uint _amount) {
        amount = _amount + 20;
    }
}
