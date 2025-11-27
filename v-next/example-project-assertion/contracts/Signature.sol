// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "./SafeERC20.sol";
import {ECDSA} from "./ECDSA.sol";

import {TokenMock} from "./MockToken.sol";

// import {ISignatureMerkleDrop128} from "./interfaces/ISignatureMerkleDrop128.sol";

error InvalidProof();
error DropAlreadyClaimed();

/**
 * @title SignatureMerkleDrop128
 * @author 1inch Network
 * @notice A gas-optimized contract for distributing tokens via 128-bit Merkle tree proofs with signature verification
 * @dev This contract uses 128-bit (16 bytes) Merkle tree nodes for gas optimization and requires
 * signature verification for claims. Each claim can only be made once, tracked via a bitmap for gas efficiency.
 */
contract SignatureMerkleDrop128 is Ownable {
  using Address for address payable;
  using SafeERC20 for IERC20;

  /* solhint-disable immutable-vars-naming */
  /// @notice The ERC20 token being distributed
  address public immutable token;
  /// @notice The 128-bit Merkle root for the distribution
  bytes16 public immutable merkleRoot;
  /// @notice The depth of the Merkle tree
  uint256 public immutable depth;
  /* solhint-enable immutable-vars-naming */

  /// @notice Bitmap tracking claimed indices (packed for gas efficiency)
  // This is a packed array of booleans.
  mapping(uint256 => uint256) private _claimedBitMap;

  /// @notice Estimated gas cost for claim operation used in cashback calculation
  uint256 private constant _CLAIM_GAS_COST = 60000;

  /**
   * @notice Allows contract to receive ETH for gas cashback functionality
   */
  receive() external payable {} // solhint-disable-line no-empty-blocks

  /**
   * @notice Constructs the SignatureMerkleDrop128 contract
   * @param token_ The address of the ERC20 token to be distributed
   * @param merkleRoot_ The 128-bit Merkle root of the distribution
   * @param depth_ The depth of the Merkle tree
   */
  constructor(
    address token_,
    bytes16 merkleRoot_,
    uint256 depth_
  ) Ownable(msg.sender) {
    token = token_;
    merkleRoot = merkleRoot_;
    depth = depth_;
  }

  /**
   * @notice Claims tokens for a receiver using a Merkle proof and signature
   * @dev The signature must be from the account that is part of the Merkle tree.
   * Includes gas cashback functionality if ETH is sent with the transaction.
   * @param receiver The address that will receive the tokens
   * @param amount The amount of tokens to claim
   * @param merkleProof The Merkle proof verifying the claim (must be a multiple of 16 bytes)
   * @param signature The signature from the account authorized in the Merkle tree
   */
  function claim(
    address receiver,
    uint256 amount,
    bytes calldata merkleProof,
    bytes calldata signature
  ) external payable {
    bytes32 signedHash = ECDSA.toEthSignedMessageHash(
      keccak256(abi.encodePacked(receiver))
    );
    address account = ECDSA.recover(signedHash, signature);
    // Verify the merkle proof.
    bytes16 node = bytes16(keccak256(abi.encodePacked(account, amount)));
    (bool valid, uint256 index) = _verifyAsm(merkleProof, merkleRoot, node);
    if (!valid) revert InvalidProof();
    _invalidate(index);
    IERC20(token).safeTransfer(receiver, amount);
    if (msg.value > 0) {
      payable(receiver).sendValue(msg.value);
    }
    _cashback();
  }

  /**
   * @notice Verifies a Merkle proof against a specified root
   * @param proof The Merkle proof to verify (must be a multiple of 16 bytes)
   * @param root The 128-bit Merkle root to verify against
   * @param leaf The 128-bit leaf node to verify
   * @return valid True if the proof is valid, false otherwise
   * @return index The index of the leaf in the Merkle tree
   */
  function verify(
    bytes calldata proof,
    bytes16 root,
    bytes16 leaf
  ) external view returns (bool valid, uint256 index) {
    return _verifyAsm(proof, root, leaf);
  }

  /**
   * @notice Verifies a Merkle proof against the contract's merkleRoot
   * @param proof The Merkle proof to verify (must be a multiple of 16 bytes)
   * @param leaf The 128-bit leaf node to verify
   * @return valid True if the proof is valid, false otherwise
   * @return index The index of the leaf in the Merkle tree
   */
  function verify(
    bytes calldata proof,
    bytes16 leaf
  ) external view returns (bool valid, uint256 index) {
    return _verifyAsm(proof, merkleRoot, leaf);
  }

  /**
   * @notice Checks if a claim at a specific index has already been made
   * @param index The index in the Merkle tree to check
   * @return True if the claim has been made, false otherwise
   */
  function isClaimed(uint256 index) external view returns (bool) {
    uint256 claimedWordIndex = index / 256;
    uint256 claimedBitIndex = index % 256;
    uint256 claimedWord = _claimedBitMap[claimedWordIndex];
    uint256 mask = (1 << claimedBitIndex);
    return claimedWord & mask == mask;
  }

  /**
   * @notice Provides gas cashback to the transaction originator
   * @dev Sends ETH back to tx.origin to compensate for gas costs, capped at basefee * _CLAIM_GAS_COST
   */
  function _cashback() private {
    uint256 balance = address(this).balance;
    if (balance > 0) {
      // solhint-disable-next-line avoid-tx-origin
      payable(tx.origin).sendValue(
        Math.min(block.basefee * _CLAIM_GAS_COST, balance)
      );
    }
  }

  /**
   * @notice Marks a claim index as used in the bitmap
   * @dev Reverts if the index has already been claimed
   * @param index The index to mark as claimed
   */
  function _invalidate(uint256 index) private {
    uint256 claimedWordIndex = index >> 8;
    uint256 claimedBitIndex = index & 0xff;
    uint256 claimedWord = _claimedBitMap[claimedWordIndex];
    uint256 newClaimedWord = claimedWord | (1 << claimedBitIndex);
    if (claimedWord == newClaimedWord) revert DropAlreadyClaimed();
    _claimedBitMap[claimedWordIndex] = newClaimedWord;
  }

  /**
   * @notice Verifies a 128-bit Merkle proof using assembly for gas optimization
   * @dev Uses sorted pairs when hashing and calculates the leaf index during verification
   * @param proof The Merkle proof to verify (must be a multiple of 16 bytes)
   * @param root The 128-bit Merkle root to verify against
   * @param leaf The 128-bit leaf node to verify
   * @return valid True if the proof is valid, false otherwise
   * @return index The calculated index of the leaf in the Merkle tree
   */
  function _verifyAsm(
    bytes calldata proof,
    bytes16 root,
    bytes16 leaf
  ) private view returns (bool valid, uint256 index) {
    /// @solidity memory-safe-assembly
    assembly {
      // solhint-disable-line no-inline-assembly
      let ptr := proof.offset
      let mask := 1

      for {
        let end := add(ptr, proof.length)
      } lt(ptr, end) {
        ptr := add(ptr, 0x10)
      } {
        let node := calldataload(ptr)

        switch lt(leaf, node)
        case 1 {
          mstore(0x00, leaf)
          mstore(0x10, node)
        }
        default {
          mstore(0x00, node)
          mstore(0x10, leaf)
          index := or(mask, index)
        }

        leaf := keccak256(0x00, 0x20)
        mask := shl(1, mask)
      }

      valid := iszero(shr(128, xor(root, leaf)))
    }
    unchecked {
      index <<= depth - proof.length / 16;
    }
  }

  /**
   * @notice Allows owner to rescue stuck funds (ETH or ERC20 tokens)
   * @dev Only callable by the contract owner
   * @param token_ The token address to rescue (use address(0) for ETH)
   * @param amount The amount to rescue
   */
  function rescueFunds(address token_, uint256 amount) external onlyOwner {
    if (token_ == address(0)) {
      payable(msg.sender).sendValue(amount);
    } else {
      IERC20(token_).safeTransfer(msg.sender, amount);
    }
  }
}
