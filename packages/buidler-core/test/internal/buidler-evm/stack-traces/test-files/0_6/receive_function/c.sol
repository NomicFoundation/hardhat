pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

  receive() external payable {
		console.log(true);
  }

}

