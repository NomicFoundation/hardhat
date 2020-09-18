pragma solidity ^0.7.0;

contract E {

  function test() public virtual {
    revert("E failed");
  }

}
