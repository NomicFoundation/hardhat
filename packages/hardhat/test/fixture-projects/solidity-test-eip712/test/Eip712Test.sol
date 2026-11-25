// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Vm {
  function eip712HashType(
    string calldata typeNameOrDefinition
  ) external pure returns (bytes32 typeHash);

  function eip712HashStruct(
    string calldata typeNameOrDefinition,
    bytes calldata abiEncodedData
  ) external pure returns (bytes32 structHash);
}

/// The cheatcode handle and the assertion every EIP-712 case in this project
/// is written against.
abstract contract Eip712Test {
  Vm internal constant vm =
    Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

  /// Reverts unless `typeName` hashes to the hash of `canonicalType`. Each
  /// case spells that string out by hand, so the expectation does not come
  /// from the collector.
  function assertTypeHash(
    string memory typeName,
    string memory canonicalType
  ) internal pure {
    require(
      vm.eip712HashType(typeName) == keccak256(bytes(canonicalType)),
      canonicalType
    );
  }
}
