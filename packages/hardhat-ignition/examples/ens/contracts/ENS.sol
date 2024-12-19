//SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

// These imports are here to force Hardhat to compile contracts we depend on in our tests but don't need anywhere else.
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/registry/FIFSRegistrar.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";
