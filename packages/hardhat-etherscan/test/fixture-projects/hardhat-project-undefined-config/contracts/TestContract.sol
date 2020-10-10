pragma solidity 0.5.15;

contract TestContract {

    uint amount;

    string message = "placeholder";

    constructor(uint _amount) public {
        amount = _amount + 20;
    }
}
