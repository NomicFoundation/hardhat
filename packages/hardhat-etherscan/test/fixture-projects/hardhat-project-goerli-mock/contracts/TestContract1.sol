pragma solidity 0.5.15;

contract TestContract1 {

    uint amount;

    string message = "placeholder";

    constructor(uint _amount) public {
        amount = _amount;
    }
}

contract InnerContract {

  function foo() public payable {
    msg.sender.transfer(msg.value);
  }
}
