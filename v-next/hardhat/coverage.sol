// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library __HardhatCoverage {
  address constant COVERAGE_ADDRESS =
    0xc0bEc0BEc0BeC0bEC0beC0bEC0bEC0beC0beC0BE;

  function _sendHitImplementation(uint256 coverageId) private view {
    address coverageAddress = COVERAGE_ADDRESS;
    /// @solidity memory-safe-assembly
    assembly {
      let ptr := mload(0x40)           // Get free memory pointer
      mstore(ptr, coverageId)          // Store coverageId at free memory
      pop(
        staticcall(
          gas(),
          coverageAddress,
          ptr,
          32,                          // Size of uint256 is 32 bytes
          0,
          0
        )
      )
    }
  }

  function _castToPure(
    function(uint256) internal view fnIn
  ) private pure returns (function(uint256) pure fnOut) {
    assembly {
      fnOut := fnIn
    }
  }

  function sendHit(uint256 coverageId) internal pure {
    _castToPure(_sendHitImplementation)(coverageId);
  }
}
