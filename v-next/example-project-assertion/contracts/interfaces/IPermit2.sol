// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title IPermit2
 * @dev Interface for a flexible permit system that extends ERC20 tokens to support permits in tokens lacking native permit functionality.
 */
interface IPermit2 {
  /**
   * @dev Struct for holding permit details.
   * @param token ERC20 token address for which the permit is issued.
   * @param amount The maximum amount allowed to spend.
   * @param expiration Timestamp until which the permit is valid.
   * @param nonce An incrementing value for each signature, unique per owner, token, and spender.
   */
  struct PermitDetails {
    address token;
    uint160 amount;
    uint48 expiration;
    uint48 nonce;
  }

  /**
   * @dev Struct for a single token allowance permit.
   * @param details Permit details including token, amount, expiration, and nonce.
   * @param spender Address authorized to spend the tokens.
   * @param sigDeadline Deadline for the permit signature, ensuring timeliness of the permit.
   */
  struct PermitSingle {
    PermitDetails details;
    address spender;
    uint256 sigDeadline;
  }

  /**
   * @dev Struct for packed allowance data to optimize storage.
   * @param amount Amount allowed.
   * @param expiration Permission expiry timestamp.
   * @param nonce Unique incrementing value for tracking allowances.
   */
  struct PackedAllowance {
    uint160 amount;
    uint48 expiration;
    uint48 nonce;
  }

  /**
   * @notice Executes a token transfer from one address to another.
   * @param user The token owner's address.
   * @param spender The address authorized to spend the tokens.
   * @param amount The amount of tokens to transfer.
   * @param token The address of the token being transferred.
   */
  function transferFrom(
    address user,
    address spender,
    uint160 amount,
    address token
  ) external;

  /**
   * @notice Issues a permit for spending tokens via a signed authorization.
   * @param owner The token owner's address.
   * @param permitSingle Struct containing the permit details.
   * @param signature The signature proving the owner authorized the permit.
   */
  function permit(
    address owner,
    PermitSingle memory permitSingle,
    bytes calldata signature
  ) external;

  /**
   * @notice Retrieves the allowance details between a token owner and spender.
   * @param user The token owner's address.
   * @param token The token address.
   * @param spender The spender's address.
   * @return The packed allowance details.
   */
  function allowance(
    address user,
    address token,
    address spender
  ) external view returns (PackedAllowance memory);

  /**
   * @notice Approves the spender to use up to amount of the specified token up until the expiration
   * @param token The token to approve
   * @param spender The spender address to approve
   * @param amount The approved amount of the token
   * @param expiration The timestamp at which the approval is no longer valid
   * @dev The packed allowance also holds a nonce, which will stay unchanged in approve
   * @dev Setting amount to type(uint160).max sets an unlimited approval
   */
  function approve(
    address token,
    address spender,
    uint160 amount,
    uint48 expiration
  ) external;
}
