pragma solidity ^0.7.0;

contract Contract {
  uint public value;
  event Increment(uint x);

  function inc(uint x) public {
    require(x > 0, "Increment cannot be zero");
    value += x;
    emit Increment(x);
  }

  function incByValue() public payable {
    value += msg.value;
    emit Increment(msg.value);
  }
}
