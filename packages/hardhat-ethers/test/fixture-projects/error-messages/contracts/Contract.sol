pragma solidity ^0.8.0;

contract Contract {
    function succeeds() public {}

    function revertsWithoutReasonString() public {
      require(false);
    }

    function revertsWithReasonString() public {
      require(false, "some reason");
    }
}
