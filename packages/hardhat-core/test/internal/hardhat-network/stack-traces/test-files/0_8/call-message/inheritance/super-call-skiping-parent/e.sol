pragma solidity ^0.8.0;

contract E {

  function test() public virtual {
    revert("E failed");
  }

}
