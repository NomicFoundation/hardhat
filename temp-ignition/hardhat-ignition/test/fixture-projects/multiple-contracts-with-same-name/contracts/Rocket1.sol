// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// This contract name is the same as in `./Rocket2.sol`
contract Rocket {
    string public name;

    constructor(string memory _name) {
        name = _name;
    }
}
