// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title IDaiLikePermit
 * @dev Interface for Dai-like permit function allowing token spending via signatures.
 */
interface IDaiLikePermit {
  /**
   * @notice Approves spending of tokens via off-chain signatures.
   * @param holder Token holder's address.
   * @param spender Spender's address.
   * @param nonce Current nonce of the holder.
   * @param expiry Time when the permit expires.
   * @param allowed True to allow, false to disallow spending.
   * @param v, r, s Signature components.
   */
  function permit(
    address holder,
    address spender,
    uint256 nonce,
    uint256 expiry,
    bool allowed,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;
}
