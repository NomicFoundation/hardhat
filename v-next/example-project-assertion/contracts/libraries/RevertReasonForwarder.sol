// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title RevertReasonForwarder
 * @notice Provides utilities for forwarding and retrieving revert reasons from failed external calls.
 */
library RevertReasonForwarder {
  /**
   * @dev Forwards the revert reason from the latest external call.
   * This method allows propagating the revert reason of a failed external call to the caller.
   */
  function reRevert() internal pure {
    // bubble up revert reason from latest external call
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)
      returndatacopy(ptr, 0, returndatasize())
      revert(ptr, returndatasize())
    }
  }

  /**
   * @dev Retrieves the revert reason from the latest external call.
   * This method enables capturing the revert reason of a failed external call for inspection or processing.
   * @return reason The latest external call revert reason.
   */
  function reReason() internal pure returns (bytes memory reason) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      reason := mload(0x40)
      let length := returndatasize()
      mstore(reason, length)
      returndatacopy(add(reason, 0x20), 0, length)
      mstore(0x40, add(reason, add(0x20, length)))
    }
  }
}
