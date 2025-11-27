// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "./interfaces/IDaiLikePermit.sol";
import "./interfaces/IPermit2.sol";
import "./interfaces/IERC7597Permit.sol";
import "./interfaces/IWETH.sol";
import "./libraries/RevertReasonForwarder.sol";

/**
 * @title Implements efficient safe methods for ERC20 interface.
 * @notice Compared to the standard ERC20, this implementation offers several enhancements:
 * 1. more gas-efficient, providing significant savings in transaction costs.
 * 2. support for different permit implementations
 * 3. forceApprove functionality
 * 4. support for WETH deposit and withdraw
 */
library SafeERC20 {
  error SafeTransferFailed();
  error SafeTransferFromFailed();
  error ForceApproveFailed();
  error SafeIncreaseAllowanceFailed();
  error SafeDecreaseAllowanceFailed();
  error SafePermitBadLength();
  error Permit2TransferAmountTooHigh();

  // Uniswap Permit2 address
  address private constant _PERMIT2 =
    0x000000000022D473030F116dDEE9F6B43aC78BA3;
  address private constant _PERMIT2_ZKSYNC =
    0x0000000000225e31D15943971F47aD3022F714Fa;
  bytes4 private constant _PERMIT_LENGTH_ERROR = 0x68275857; // SafePermitBadLength.selector

  /**
   * @notice Fetches the balance of a specific ERC20 token held by an account.
   * Consumes less gas then regular `ERC20.balanceOf`.
   * @dev Note that the implementation does not perform dirty bits cleaning, so it is the
   * responsibility of the caller to make sure that the higher 96 bits of the `account` parameter are clean.
   * @param token The IERC20 token contract for which the balance will be fetched.
   * @param account The address of the account whose token balance will be fetched.
   * @return tokenBalance The balance of the specified ERC20 token held by the account.
   */
  function safeBalanceOf(
    IERC20 token,
    address account
  ) internal view returns (uint256 tokenBalance) {
    bytes4 selector = IERC20.balanceOf.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      mstore(0x00, selector)
      mstore(0x04, account)
      let success := staticcall(gas(), token, 0x00, 0x24, 0x00, 0x20)
      tokenBalance := mload(0)

      if or(iszero(success), lt(returndatasize(), 0x20)) {
        let ptr := mload(0x40)
        returndatacopy(ptr, 0, returndatasize())
        revert(ptr, returndatasize())
      }
    }
  }

  /**
   * @notice Attempts to safely transfer tokens from one address to another.
   * @dev If permit2 is true, uses the Permit2 standard; otherwise uses the standard ERC20 transferFrom.
   * Either requires `true` in return data, or requires target to be smart-contract and empty return data.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `from` and `to` parameters are clean.
   * @param token The IERC20 token contract from which the tokens will be transferred.
   * @param from The address from which the tokens will be transferred.
   * @param to The address to which the tokens will be transferred.
   * @param amount The amount of tokens to transfer.
   * @param permit2 If true, uses the Permit2 standard for the transfer; otherwise uses the standard ERC20 transferFrom.
   */
  function safeTransferFromUniversal(
    IERC20 token,
    address from,
    address to,
    uint256 amount,
    bool permit2
  ) internal {
    if (permit2) {
      safeTransferFromPermit2(token, from, to, amount);
    } else {
      safeTransferFrom(token, from, to, amount);
    }
  }

  /**
   * @notice Attempts to safely transfer tokens from one address to another using the ERC20 standard.
   * @dev Either requires `true` in return data, or requires target to be smart-contract and empty return data.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `from` and `to` parameters are clean.
   * @param token The IERC20 token contract from which the tokens will be transferred.
   * @param from The address from which the tokens will be transferred.
   * @param to The address to which the tokens will be transferred.
   * @param amount The amount of tokens to transfer.
   */
  function safeTransferFrom(
    IERC20 token,
    address from,
    address to,
    uint256 amount
  ) internal {
    bytes4 selector = token.transferFrom.selector;
    bool success;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let data := mload(0x40)

      mstore(data, selector)
      mstore(add(data, 0x04), from)
      mstore(add(data, 0x24), to)
      mstore(add(data, 0x44), amount)
      success := call(gas(), token, 0, data, 0x64, 0x0, 0x20)
      if success {
        switch returndatasize()
        case 0 {
          success := gt(extcodesize(token), 0)
        }
        default {
          success := and(gt(returndatasize(), 31), eq(mload(0), 1))
        }
      }
    }
    if (!success) revert SafeTransferFromFailed();
  }

  /**
   * @notice Attempts to safely transfer tokens from one address to another using the Permit2 standard.
   * @dev Either requires `true` in return data, or requires target to be smart-contract and empty return data.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `from` and `to` parameters are clean.
   * @param token The IERC20 token contract from which the tokens will be transferred.
   * @param from The address from which the tokens will be transferred.
   * @param to The address to which the tokens will be transferred.
   * @param amount The amount of tokens to transfer.
   */
  function safeTransferFromPermit2(
    IERC20 token,
    address from,
    address to,
    uint256 amount
  ) internal {
    if (amount > type(uint160).max) revert Permit2TransferAmountTooHigh();
    address permit2 = _getPermit2Address();
    bytes4 selector = IPermit2.transferFrom.selector;
    bool success;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let data := mload(0x40)

      mstore(data, selector)
      mstore(add(data, 0x04), from)
      mstore(add(data, 0x24), to)
      mstore(add(data, 0x44), amount)
      mstore(add(data, 0x64), token)
      success := call(gas(), permit2, 0, data, 0x84, 0x0, 0x0)
      if success {
        success := gt(extcodesize(permit2), 0)
      }
    }
    if (!success) revert SafeTransferFromFailed();
  }

  /**
   * @notice Attempts to safely transfer tokens to another address.
   * @dev Either requires `true` in return data, or requires target to be smart-contract and empty return data.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `to` parameter are clean.
   * @param token The IERC20 token contract from which the tokens will be transferred.
   * @param to The address to which the tokens will be transferred.
   * @param amount The amount of tokens to transfer.
   */
  function safeTransfer(IERC20 token, address to, uint256 amount) internal {
    if (!_makeCall(token, token.transfer.selector, to, amount)) {
      revert SafeTransferFailed();
    }
  }

  /**
   * @notice Attempts to approve a spender to spend a certain amount of tokens.
   * @dev If `approve(from, to, amount)` fails, it tries to set the allowance to zero, and retries the `approve` call.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `spender` parameter are clean.
   * @param token The IERC20 token contract on which the call will be made.
   * @param spender The address which will spend the funds.
   * @param value The amount of tokens to be spent.
   */
  function forceApprove(IERC20 token, address spender, uint256 value) internal {
    if (!_makeCall(token, token.approve.selector, spender, value)) {
      if (
        !_makeCall(token, token.approve.selector, spender, 0) ||
        !_makeCall(token, token.approve.selector, spender, value)
      ) {
        revert ForceApproveFailed();
      }
    }
  }

  /**
   * @notice Safely increases the allowance of a spender.
   * @dev Increases with safe math check. Checks if the increased allowance will overflow, if yes, then it reverts the transaction.
   * Then uses `forceApprove` to increase the allowance.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `spender` parameter are clean.
   * @param token The IERC20 token contract on which the call will be made.
   * @param spender The address which will spend the funds.
   * @param value The amount of tokens to increase the allowance by.
   */
  function safeIncreaseAllowance(
    IERC20 token,
    address spender,
    uint256 value
  ) internal {
    uint256 allowance = token.allowance(address(this), spender);
    if (value > type(uint256).max - allowance)
      revert SafeIncreaseAllowanceFailed();
    forceApprove(token, spender, allowance + value);
  }

  /**
   * @notice Safely decreases the allowance of a spender.
   * @dev Decreases with safe math check. Checks if the decreased allowance will underflow, if yes, then it reverts the transaction.
   * Then uses `forceApprove` to increase the allowance.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `spender` parameter are clean.
   * @param token The IERC20 token contract on which the call will be made.
   * @param spender The address which will spend the funds.
   * @param value The amount of tokens to decrease the allowance by.
   */
  function safeDecreaseAllowance(
    IERC20 token,
    address spender,
    uint256 value
  ) internal {
    uint256 allowance = token.allowance(address(this), spender);
    if (value > allowance) revert SafeDecreaseAllowanceFailed();
    forceApprove(token, spender, allowance - value);
  }

  /**
   * @notice Attempts to execute the `permit` function on the provided token with the sender and contract as parameters.
   * Permit type is determined automatically based on permit calldata (IERC20Permit, IDaiLikePermit, and IPermit2).
   * @dev Wraps `tryPermit` function and forwards revert reason if permit fails.
   * @param token The IERC20 token to execute the permit function on.
   * @param permit The permit data to be used in the function call.
   */
  function safePermit(IERC20 token, bytes calldata permit) internal {
    if (!tryPermit(token, msg.sender, address(this), permit))
      RevertReasonForwarder.reRevert();
  }

  /**
   * @notice Attempts to execute the `permit` function on the provided token with custom owner and spender parameters.
   * Permit type is determined automatically based on permit calldata (IERC20Permit, IDaiLikePermit, and IPermit2).
   * @dev Wraps `tryPermit` function and forwards revert reason if permit fails.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `owner` and `spender` parameters are clean.
   * @param token The IERC20 token to execute the permit function on.
   * @param owner The owner of the tokens for which the permit is made.
   * @param spender The spender allowed to spend the tokens by the permit.
   * @param permit The permit data to be used in the function call.
   */
  function safePermit(
    IERC20 token,
    address owner,
    address spender,
    bytes calldata permit
  ) internal {
    if (!tryPermit(token, owner, spender, permit))
      RevertReasonForwarder.reRevert();
  }

  /**
   * @notice Attempts to execute the `permit` function on the provided token with the sender and contract as parameters.
   * @dev Invokes `tryPermit` with sender as owner and contract as spender.
   * @param token The IERC20 token to execute the permit function on.
   * @param permit The permit data to be used in the function call.
   * @return success Returns true if the permit function was successfully executed, false otherwise.
   */
  function tryPermit(
    IERC20 token,
    bytes calldata permit
  ) internal returns (bool success) {
    return tryPermit(token, msg.sender, address(this), permit);
  }

  /**
   * @notice The function attempts to call the permit function on a given ERC20 token.
   * @dev The function is designed to support a variety of permit functions, namely: IERC20Permit, IDaiLikePermit, IERC7597Permit and IPermit2.
   * It accommodates both Compact and Full formats of these permit types.
   * Please note, it is expected that the `expiration` parameter for the compact Permit2 and the `deadline` parameter
   * for the compact Permit are to be incremented by one before invoking this function. This approach is motivated by
   * gas efficiency considerations; as the unlimited expiration period is likely to be the most common scenario, and
   * zeros are cheaper to pass in terms of gas cost. Thus, callers should increment the expiration or deadline by one
   * before invocation for optimized performance.
   * Note that the implementation does not perform dirty bits cleaning, so it is the responsibility of
   * the caller to make sure that the higher 96 bits of the `owner` and `spender` parameters are clean.
   * @param token The address of the ERC20 token on which to call the permit function.
   * @param owner The owner of the tokens. This address should have signed the off-chain permit.
   * @param spender The address which will be approved for transfer of tokens.
   * @param permit The off-chain permit data, containing different fields depending on the type of permit function.
   * @return success A boolean indicating whether the permit call was successful.
   */
  function tryPermit(
    IERC20 token,
    address owner,
    address spender,
    bytes calldata permit
  ) internal returns (bool success) {
    address permit2 = _getPermit2Address();
    // load function selectors for different permit standards
    bytes4 permitSelector = IERC20Permit.permit.selector;
    bytes4 daiPermitSelector = IDaiLikePermit.permit.selector;
    bytes4 permit2Selector = IPermit2.permit.selector;
    bytes4 erc7597PermitSelector = IERC7597Permit.permit.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      // Switch case for different permit lengths, indicating different permit standards
      switch permit.length
      // Compact IERC20Permit
      case 100 {
        mstore(ptr, permitSelector) // store selector
        mstore(add(ptr, 0x04), owner) // store owner
        mstore(add(ptr, 0x24), spender) // store spender

        // Compact IERC20Permit.permit(uint256 value, uint32 deadline, uint256 r, uint256 vs)
        {
          // stack too deep
          let deadline := shr(224, calldataload(add(permit.offset, 0x20))) // loads permit.offset 0x20..0x23
          let vs := calldataload(add(permit.offset, 0x44)) // loads permit.offset 0x44..0x63

          calldatacopy(add(ptr, 0x44), permit.offset, 0x20) // store value     = copy permit.offset 0x00..0x19
          mstore(add(ptr, 0x64), sub(deadline, 1)) // store deadline  = deadline - 1
          mstore(add(ptr, 0x84), add(27, shr(255, vs))) // store v         = most significant bit of vs + 27 (27 or 28)
          calldatacopy(add(ptr, 0xa4), add(permit.offset, 0x24), 0x20) // store r         = copy permit.offset 0x24..0x43
          mstore(add(ptr, 0xc4), shr(1, shl(1, vs))) // store s         = vs without most significant bit
        }
        // IERC20Permit.permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
      }
      // Compact IDaiLikePermit
      case 72 {
        mstore(ptr, daiPermitSelector) // store selector
        mstore(add(ptr, 0x04), owner) // store owner
        mstore(add(ptr, 0x24), spender) // store spender

        // Compact IDaiLikePermit.permit(uint32 nonce, uint32 expiry, uint256 r, uint256 vs)
        {
          // stack too deep
          let expiry := shr(224, calldataload(add(permit.offset, 0x04))) // loads permit.offset 0x04..0x07
          let vs := calldataload(add(permit.offset, 0x28)) // loads permit.offset 0x28..0x47

          mstore(add(ptr, 0x44), shr(224, calldataload(permit.offset))) // store nonce   = copy permit.offset 0x00..0x03
          mstore(add(ptr, 0x64), sub(expiry, 1)) // store expiry  = expiry - 1
          mstore(add(ptr, 0x84), true) // store allowed = true
          mstore(add(ptr, 0xa4), add(27, shr(255, vs))) // store v       = most significant bit of vs + 27 (27 or 28)
          calldatacopy(add(ptr, 0xc4), add(permit.offset, 0x08), 0x20) // store r       = copy permit.offset 0x08..0x27
          mstore(add(ptr, 0xe4), shr(1, shl(1, vs))) // store s       = vs without most significant bit
        }
        // IDaiLikePermit.permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s)
        success := call(gas(), token, 0, ptr, 0x104, 0, 0)
      }
      // IERC20Permit
      case 224 {
        mstore(ptr, permitSelector)
        calldatacopy(add(ptr, 0x04), permit.offset, permit.length) // copy permit calldata
        // IERC20Permit.permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        success := call(gas(), token, 0, ptr, 0xe4, 0, 0)
      }
      // IDaiLikePermit
      case 256 {
        mstore(ptr, daiPermitSelector)
        calldatacopy(add(ptr, 0x04), permit.offset, permit.length) // copy permit calldata
        // IDaiLikePermit.permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s)
        success := call(gas(), token, 0, ptr, 0x104, 0, 0)
      }
      // Compact IPermit2
      case 96 {
        // Compact IPermit2.permit(uint160 amount, uint32 expiration, uint32 nonce, uint32 sigDeadline, uint256 r, uint256 vs)
        mstore(ptr, permit2Selector) // store selector
        mstore(add(ptr, 0x04), owner) // store owner
        mstore(add(ptr, 0x24), token) // store token

        calldatacopy(add(ptr, 0x50), permit.offset, 0x14) // store amount = copy permit.offset 0x00..0x13
        // and(0xffffffffffff, ...) - conversion to uint48
        mstore(
          add(ptr, 0x64),
          and(
            0xffffffffffff,
            sub(shr(224, calldataload(add(permit.offset, 0x14))), 1)
          )
        ) // store expiration = ((permit.offset 0x14..0x17 - 1) & 0xffffffffffff)
        mstore(add(ptr, 0x84), shr(224, calldataload(add(permit.offset, 0x18)))) // store nonce = copy permit.offset 0x18..0x1b
        mstore(add(ptr, 0xa4), spender) // store spender
        // and(0xffffffffffff, ...) - conversion to uint48
        mstore(
          add(ptr, 0xc4),
          and(
            0xffffffffffff,
            sub(shr(224, calldataload(add(permit.offset, 0x1c))), 1)
          )
        ) // store sigDeadline = ((permit.offset 0x1c..0x1f - 1) & 0xffffffffffff)
        mstore(add(ptr, 0xe4), 0x100) // store offset = 256
        mstore(add(ptr, 0x104), 0x40) // store length = 64
        calldatacopy(add(ptr, 0x124), add(permit.offset, 0x20), 0x20) // store r      = copy permit.offset 0x20..0x3f
        calldatacopy(add(ptr, 0x144), add(permit.offset, 0x40), 0x20) // store vs     = copy permit.offset 0x40..0x5f
        // IPermit2.permit(address owner, PermitSingle calldata permitSingle, bytes calldata signature)
        success := call(gas(), permit2, 0, ptr, 0x164, 0, 0)
      }
      // IPermit2
      case 352 {
        mstore(ptr, permit2Selector)
        calldatacopy(add(ptr, 0x04), permit.offset, permit.length) // copy permit calldata
        // IPermit2.permit(address owner, PermitSingle calldata permitSingle, bytes calldata signature)
        success := call(gas(), permit2, 0, ptr, 0x164, 0, 0)
      }
      // Dynamic length
      default {
        mstore(ptr, erc7597PermitSelector)
        calldatacopy(add(ptr, 0x04), permit.offset, permit.length) // copy permit calldata
        // IERC7597Permit.permit(address owner, address spender, uint256 value, uint256 deadline, bytes memory signature)
        success := call(gas(), token, 0, ptr, add(permit.length, 4), 0, 0)
      }
    }
  }

  /**
   * @dev Executes a low level call to a token contract, making it resistant to reversion and erroneous boolean returns.
   * @param token The IERC20 token contract on which the call will be made.
   * @param selector The function signature that is to be called on the token contract.
   * @param to The address to which the token amount will be transferred.
   * @param amount The token amount to be transferred.
   * @return success A boolean indicating if the call was successful. Returns 'true' on success and 'false' on failure.
   * In case of success but no returned data, validates that the contract code exists.
   * In case of returned data, ensures that it's a boolean `true`.
   */
  function _makeCall(
    IERC20 token,
    bytes4 selector,
    address to,
    uint256 amount
  ) private returns (bool success) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let data := mload(0x40)

      mstore(data, selector)
      mstore(add(data, 0x04), to)
      mstore(add(data, 0x24), amount)
      success := call(gas(), token, 0, data, 0x44, 0x0, 0x20)
      if success {
        switch returndatasize()
        case 0 {
          success := gt(extcodesize(token), 0)
        }
        default {
          success := and(gt(returndatasize(), 31), eq(mload(0), 1))
        }
      }
    }
  }

  /**
   * @notice Safely deposits a specified amount of Ether into the IWETH contract. Consumes less gas then regular `IWETH.deposit`.
   * @param weth The IWETH token contract.
   * @param amount The amount of Ether to deposit into the IWETH contract.
   */
  function safeDeposit(IWETH weth, uint256 amount) internal {
    bytes4 selector = IWETH.deposit.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      mstore(0, selector)
      if iszero(call(gas(), weth, amount, 0, 4, 0, 0)) {
        let ptr := mload(0x40)
        returndatacopy(ptr, 0, returndatasize())
        revert(ptr, returndatasize())
      }
    }
  }

  /**
   * @notice Safely withdraws a specified amount of wrapped Ether from the IWETH contract. Consumes less gas then regular `IWETH.withdraw`.
   * @dev Uses inline assembly to interact with the IWETH contract.
   * @param weth The IWETH token contract.
   * @param amount The amount of wrapped Ether to withdraw from the IWETH contract.
   */
  function safeWithdraw(IWETH weth, uint256 amount) internal {
    bytes4 selector = IWETH.withdraw.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      mstore(0, selector)
      mstore(4, amount)
      if iszero(call(gas(), weth, 0, 0, 0x24, 0, 0)) {
        let ptr := mload(0x40)
        returndatacopy(ptr, 0, returndatasize())
        revert(ptr, returndatasize())
      }
    }
  }

  /**
   * @notice Safely withdraws a specified amount of wrapped Ether from the IWETH contract to a specified recipient.
   * Consumes less gas then regular `IWETH.withdraw`.
   * @param weth The IWETH token contract.
   * @param amount The amount of wrapped Ether to withdraw from the IWETH contract.
   * @param to The recipient of the withdrawn Ether.
   */
  function safeWithdrawTo(IWETH weth, uint256 amount, address to) internal {
    safeWithdraw(weth, amount);
    if (to != address(this)) {
      assembly ("memory-safe") {
        // solhint-disable-line no-inline-assembly
        if iszero(call(gas(), to, amount, 0, 0, 0, 0)) {
          let ptr := mload(0x40)
          returndatacopy(ptr, 0, returndatasize())
          revert(ptr, returndatasize())
        }
      }
    }
  }

  function _getPermit2Address() private view returns (address permit2) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      switch chainid()
      case 324 {
        // zksync mainnet
        permit2 := _PERMIT2_ZKSYNC
      }
      case 300 {
        // zksync testnet
        permit2 := _PERMIT2_ZKSYNC
      }
      case 260 {
        // zksync fork network
        permit2 := _PERMIT2_ZKSYNC
      }
      default {
        permit2 := _PERMIT2
      }
    }
  }
}
