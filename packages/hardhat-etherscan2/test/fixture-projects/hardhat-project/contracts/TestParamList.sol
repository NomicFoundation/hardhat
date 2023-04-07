// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.5;

pragma experimental ABIEncoderV2;

contract TestParamList {
    struct Point {
        uint x;
        uint y;
    }

    uint public amount;
    string public aString;
    Point public point;

    string message = "placeholder";

    constructor(uint _amount, string memory _aString, Point memory _point) {
        amount = _amount + 20;
        aString = _aString;
        point = _point;
    }
}
