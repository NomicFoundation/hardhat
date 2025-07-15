// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Predeploy {
  // This function checks the size of the L1Block predeploy contract.
  // The L1Block predeploy is only available in OP chain types, so this function
  // will return a zero size in L1 or other non-OP chains.
  function getPredeploySize() external view returns (uint256) {
    address l1BlockPredeployAddress = 0x4200000000000000000000000000000000000015;
    uint256 predeploySize;

    assembly {
      predeploySize := extcodesize(l1BlockPredeployAddress)
    }

    return predeploySize;
  }
}
