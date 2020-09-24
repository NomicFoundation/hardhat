pragma solidity ^0.6.0;

contract E {

  function test() public virtual {
    revert("E failed");
  }

}
