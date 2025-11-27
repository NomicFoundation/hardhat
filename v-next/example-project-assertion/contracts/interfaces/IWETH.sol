// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IWETH
 * @dev Interface for wrapper as WETH-like token.
 */
interface IWETH is IERC20 {
  /**
   * @notice Emitted when Ether is deposited to get wrapper tokens.
   */
  event Deposit(address indexed dst, uint256 wad);

  /**
   * @notice Emitted when wrapper tokens is withdrawn as Ether.
   */
  event Withdrawal(address indexed src, uint256 wad);

  /**
   * @notice Deposit Ether to get wrapper tokens.
   */
  function deposit() external payable;

  /**
   * @notice Withdraw wrapped tokens as Ether.
   * @param amount Amount of wrapped tokens to withdraw.
   */
  function withdraw(uint256 amount) external;
}
