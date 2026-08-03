// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// A plain (non-`.t.sol`) helper/mock contract living under the `test/`
// directory, which this project also lists in `paths.sources.solidity`.
contract Mock {
    uint256 public value;

    function set(uint256 newValue) external {
        value = newValue;
    }
}
