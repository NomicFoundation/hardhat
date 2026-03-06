// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

contract Counter {
    uint256 public count;

    function increment() public {
        count += 1;
    }

    function decrement() public {
        require(count > 0, "Counter: decrement overflow");
        count -= 1;
    }
}
