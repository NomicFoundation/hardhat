// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @dev Minimal mock used to demonstrate the storage-tracing difference
///      between Hardhat 2 (`hardhat-tracer`) and Hardhat 3 (`-v`).
///
///      `_version` (uint8) and `_initialized` (bool) are packed into the
///      same storage slot (slot 0), so `initialize` performs two SSTOREs
///      into that single slot, and `version()` performs one SLOAD.
contract Initializable__Mock {
    uint8 private _version;
    bool private _initialized;

    event Initialized(uint256 version);

    function initialize(uint8 _v) public payable {
        require(!_initialized, "Contract is already initialized");
        _version = _v; // SSTORE
        _initialized = true; // SSTORE (packed into the same slot)
        emit Initialized(_v);
    }

    function version() public view returns (uint8) {
        return _version; // SLOAD
    }
}
