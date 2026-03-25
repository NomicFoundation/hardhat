// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {console} from "hardhat/console.sol";

// We need to define two different proxies so that their implementation
// storage slots are different, so we can chain them.
abstract contract BaseProxy {
  fallback() external payable {
    address impl = getImplementation();
    assembly {
      calldatacopy(0, 0, calldatasize())
      let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
      returndatacopy(0, 0, returndatasize())
      switch result
      case 0 {
        revert(0, returndatasize())
      }
      default {
        return(0, returndatasize())
      }
    }
  }

  function getImplementation() internal view virtual returns (address);

  receive() external payable {}
}

contract Proxy is BaseProxy {
  address implementation;

  constructor(address _impl) {
    console.log("Setting implementation for Proxy:", _impl);
    implementation = _impl;
  }

  function getImplementation() internal view override returns (address) {
    console.log("Getting implementation for Proxy:", implementation);
    return implementation;
  }
}

contract Proxy2 is BaseProxy {
  address implementation;
  address proxy1;

  constructor(address _impl, address _proxy1) {
    console.log("Setting implementation for Proxy2:", _impl);
    proxy1 = _proxy1;
    implementation = _impl;
  }

  function getImplementation() internal view override returns (address) {
    console.log("Getting implementation for Proxy2:", proxy1);
    return proxy1;
  }
}

contract Impl1 {
  function one() external returns (uint256) {
    return 1;
  }
}

contract Impl2 {
  function two() external returns (uint256) {
    return 2;
  }
}
