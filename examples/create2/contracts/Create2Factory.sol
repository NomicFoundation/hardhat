//SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/utils/Create2.sol";

contract Create2Factory {
  event Deployed(bytes32 indexed salt, address deployed);

  function deploy(
    uint256 amount,
    bytes32 salt,
    bytes memory bytecode
  ) public returns (address) {
    address deployedAddress;

    deployedAddress = Create2.deploy(amount, salt, bytecode);
    emit Deployed(salt, deployedAddress);

    return deployedAddress;
  }
}
