// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Trace {
    string[] public entries;

    constructor(string memory firstEntry) {
        entries = [firstEntry];
    }

    function addEntry(string memory entry) public {
        entries.push(entry);
    }
}
