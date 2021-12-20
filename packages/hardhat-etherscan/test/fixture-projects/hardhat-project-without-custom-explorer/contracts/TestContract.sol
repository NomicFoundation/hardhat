pragma solidity 0.5.15;

// import "./libraries/SafeMath.sol";
import "./TestContract1.sol";

contract TestContract {

    TestContract1 tc1;

    // using SafeMath for uint256;

    uint amount;

    string message = "placeholder";

    constructor(uint _amount) public {
        amount = _amount + 20;
    }
}
