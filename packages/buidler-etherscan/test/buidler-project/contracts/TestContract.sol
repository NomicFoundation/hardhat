pragma solidity 0.5.1;

import "./libraries/SafeMath.sol";

contract TestContract {

    using SafeMath for uint256;

    uint amount;

    string message = "placeholder";

    constructor(uint _amount) public {
        amount = _amount.add(20);
    }
}
