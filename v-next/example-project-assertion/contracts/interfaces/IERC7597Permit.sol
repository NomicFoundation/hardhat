// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title IERC7597Permit
 * @dev A new extension for ERC-2612 permit, which has already been added to USDC v2.2.
 */
interface IERC7597Permit {
  /**
   * @notice Update allowance with a signed permit.
   * @dev Signature bytes can be used for both EOA wallets and contract wallets.
   * @param owner Token owner's address (Authorizer).
   * @param spender Spender's address.
   * @param value Amount of allowance.
   * @param deadline The time at which the signature expires (unixtime).
   * @param signature Unstructured bytes signature signed by an EOA wallet or a contract wallet.
   */
  function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    bytes memory signature
  ) external;
}
