// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/**
 * @title ECDSA signature operations
 * @notice Provides functions for recovering addresses from signatures and verifying signatures, including support for EIP-2098 compact signatures.
 */
library ECDSA {
  // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
  // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
  // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}. Most
  // signatures from current libraries generate a unique signature with an s-value in the lower half order.
  //
  // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
  // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
  // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
  // these malleable signatures as well.
  uint256 private constant _S_BOUNDARY =
    0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0 + 1;
  uint256 private constant _COMPACT_S_MASK =
    0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
  uint256 private constant _COMPACT_V_SHIFT = 255;

  /**
   * @notice Recovers the signer's address from the signature.
   * @dev Recovers the address that has signed a hash with `(v, r, s)` signature.
   * @param hash The keccak256 hash of the data signed.
   * @param v The recovery byte of the signature.
   * @param r The first 32 bytes of the signature.
   * @param s The second 32 bytes of the signature.
   * @return signer The address of the signer.
   */
  function recover(
    bytes32 hash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view returns (address signer) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      if lt(s, _S_BOUNDARY) {
        let ptr := mload(0x40)

        mstore(ptr, hash)
        mstore(add(ptr, 0x20), v)
        mstore(add(ptr, 0x40), r)
        mstore(add(ptr, 0x60), s)
        mstore(0, 0)
        pop(staticcall(gas(), 0x1, ptr, 0x80, 0, 0x20))
        signer := mload(0)
      }
    }
  }

  /**
   * @notice Recovers the signer's address from the signature using `r` and `vs` components.
   * @dev Recovers the address that has signed a hash with `r` and `vs`, where `vs` combines `v` and `s`.
   * @param hash The keccak256 hash of the data signed.
   * @param r The first 32 bytes of the signature.
   * @param vs The combined `v` and `s` values of the signature.
   * @return signer The address of the signer.
   */
  function recover(
    bytes32 hash,
    bytes32 r,
    bytes32 vs
  ) internal view returns (address signer) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let s := and(vs, _COMPACT_S_MASK)
      if lt(s, _S_BOUNDARY) {
        let ptr := mload(0x40)

        mstore(ptr, hash)
        mstore(add(ptr, 0x20), add(27, shr(_COMPACT_V_SHIFT, vs)))
        mstore(add(ptr, 0x40), r)
        mstore(add(ptr, 0x60), s)
        mstore(0, 0)
        pop(staticcall(gas(), 0x1, ptr, 0x80, 0, 0x20))
        signer := mload(0)
      }
    }
  }

  /**
   * @notice Recovers the signer's address from a hash and a signature.
   * @param hash The keccak256 hash of the signed data.
   * @param signature The full signature from which the signer will be recovered.
   * @return signer The address of the signer.
   */
  /// @dev WARNING!!!
  /// There is a known signature malleability issue with two representations of signatures!
  /// Even though this function is able to verify both standard 65-byte and compact 64-byte EIP-2098 signatures
  /// one should never use raw signatures for any kind of invalidation logic in their code.
  /// As the standard and compact representations are interchangeable any invalidation logic that relies on
  /// signature uniqueness will get rekt.
  /// More info: https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-4h98-2769-gh6h
  function recover(
    bytes32 hash,
    bytes calldata signature
  ) internal view returns (address signer) {
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      // memory[ptr:ptr+0x80] = (hash, v, r, s)
      switch signature.length
      case 65 {
        // memory[ptr+0x20:ptr+0x80] = (v, r, s)
        mstore(
          add(ptr, 0x20),
          byte(0, calldataload(add(signature.offset, 0x40)))
        )
        calldatacopy(add(ptr, 0x40), signature.offset, 0x40)
      }
      case 64 {
        // memory[ptr+0x20:ptr+0x80] = (v, r, s)
        let vs := calldataload(add(signature.offset, 0x20))
        mstore(add(ptr, 0x20), add(27, shr(_COMPACT_V_SHIFT, vs)))
        calldatacopy(add(ptr, 0x40), signature.offset, 0x20)
        mstore(add(ptr, 0x60), and(vs, _COMPACT_S_MASK))
      }
      default {
        ptr := 0
      }

      if ptr {
        if lt(mload(add(ptr, 0x60)), _S_BOUNDARY) {
          // memory[ptr:ptr+0x20] = (hash)
          mstore(ptr, hash)

          mstore(0, 0)
          pop(staticcall(gas(), 0x1, ptr, 0x80, 0, 0x20))
          signer := mload(0)
        }
      }
    }
  }

  /**
   * @notice Verifies the signature for a hash, either by recovering the signer or using EIP-1271's `isValidSignature` function.
   * @dev Attempts to recover the signer's address from the signature; if the address is non-zero, checks if it's valid according to EIP-1271.
   * @param signer The address to validate the signature against.
   * @param hash The hash of the signed data.
   * @param signature The signature to verify.
   * @return success True if the signature is verified, false otherwise.
   */
  function recoverOrIsValidSignature(
    address signer,
    bytes32 hash,
    bytes calldata signature
  ) internal view returns (bool success) {
    if (signer == address(0)) return false;
    if (
      (signature.length == 64 || signature.length == 65) &&
      recover(hash, signature) == signer
    ) {
      return true;
    }
    return isValidSignature(signer, hash, signature);
  }

  /**
   * @notice Verifies the signature for a hash, either by recovering the signer or using EIP-1271's `isValidSignature` function.
   * @dev Attempts to recover the signer's address from the signature; if the address is non-zero, checks if it's valid according to EIP-1271.
   * @param signer The address to validate the signature against.
   * @param hash The hash of the signed data.
   * @param v The recovery byte of the signature.
   * @param r The first 32 bytes of the signature.
   * @param s The second 32 bytes of the signature.
   * @return success True if the signature is verified, false otherwise.
   */
  function recoverOrIsValidSignature(
    address signer,
    bytes32 hash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view returns (bool success) {
    if (signer == address(0)) return false;
    if (recover(hash, v, r, s) == signer) {
      return true;
    }
    return isValidSignature(signer, hash, v, r, s);
  }

  /**
   * @notice Verifies the signature for a hash, either by recovering the signer or using EIP-1271's `isValidSignature` function.
   * @dev Attempts to recover the signer's address from the signature; if the address is non-zero, checks if it's valid according to EIP-1271.
   * @param signer The address to validate the signature against.
   * @param hash The hash of the signed data.
   * @param r The first 32 bytes of the signature.
   * @param vs The combined `v` and `s` values of the signature.
   * @return success True if the signature is verified, false otherwise.
   */
  function recoverOrIsValidSignature(
    address signer,
    bytes32 hash,
    bytes32 r,
    bytes32 vs
  ) internal view returns (bool success) {
    if (signer == address(0)) return false;
    if (recover(hash, r, vs) == signer) {
      return true;
    }
    return isValidSignature(signer, hash, r, vs);
  }

  /**
   * @notice Verifies the signature for a given hash, attempting to recover the signer's address or validates it using EIP-1271 for 65-byte signatures.
   * @dev Attempts to recover the signer's address from the signature. If the address is a contract, checks if the signature is valid according to EIP-1271.
   * @param signer The expected signer's address.
   * @param hash The keccak256 hash of the signed data.
   * @param r The first 32 bytes of the signature.
   * @param vs The last 32 bytes of the signature, with the last byte being the recovery id.
   * @return success True if the signature is valid, false otherwise.
   */
  function recoverOrIsValidSignature65(
    address signer,
    bytes32 hash,
    bytes32 r,
    bytes32 vs
  ) internal view returns (bool success) {
    if (signer == address(0)) return false;
    if (recover(hash, r, vs) == signer) {
      return true;
    }
    return isValidSignature65(signer, hash, r, vs);
  }

  /**
   * @notice Validates a signature for a hash using EIP-1271, if `signer` is a contract.
   * @dev Makes a static call to `signer` with `isValidSignature` function selector from EIP-1271.
   * @param signer The address of the signer to validate against, which could be an EOA or a contract.
   * @param hash The hash of the signed data.
   * @param signature The signature to validate.
   * @return success True if the signature is valid according to EIP-1271, false otherwise.
   */
  function isValidSignature(
    address signer,
    bytes32 hash,
    bytes calldata signature
  ) internal view returns (bool success) {
    // (bool success, bytes memory data) = signer.staticcall(abi.encodeWithSelector(IERC1271.isValidSignature.selector, hash, signature));
    // return success && data.length == 32 && abi.decode(data, (bytes4)) == IERC1271.isValidSignature.selector;
    bytes4 selector = IERC1271.isValidSignature.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      mstore(ptr, selector)
      mstore(add(ptr, 0x04), hash)
      mstore(add(ptr, 0x24), 0x40)
      mstore(add(ptr, 0x44), signature.length)
      calldatacopy(add(ptr, 0x64), signature.offset, signature.length)
      if staticcall(gas(), signer, ptr, add(0x64, signature.length), 0, 0x20) {
        success := and(eq(selector, mload(0)), eq(returndatasize(), 0x20))
      }
    }
  }

  /**
   * @notice Validates a signature for a hash using EIP-1271, if `signer` is a contract.
   * @dev Makes a static call to `signer` with `isValidSignature` function selector from EIP-1271.
   * @param signer The address of the signer to validate against, which could be an EOA or a contract.
   * @param hash The hash of the signed data.
   * @param v The recovery byte of the signature.
   * @param r The first 32 bytes of the signature.
   * @param s The second 32 bytes of the signature.
   * @return success True if the signature is valid according to EIP-1271, false otherwise.
   */
  function isValidSignature(
    address signer,
    bytes32 hash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view returns (bool success) {
    bytes4 selector = IERC1271.isValidSignature.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      mstore(ptr, selector)
      mstore(add(ptr, 0x04), hash)
      mstore(add(ptr, 0x24), 0x40)
      mstore(add(ptr, 0x44), 65)
      mstore(add(ptr, 0x64), r)
      mstore(add(ptr, 0x84), s)
      mstore8(add(ptr, 0xa4), v)
      if staticcall(gas(), signer, ptr, 0xa5, 0, 0x20) {
        success := and(eq(selector, mload(0)), eq(returndatasize(), 0x20))
      }
    }
  }

  /**
   * @notice Validates a signature for a hash using EIP-1271, if `signer` is a contract.
   * @dev Makes a static call to `signer` with `isValidSignature` function selector from EIP-1271.
   * @param signer The address of the signer to validate against, which could be an EOA or a contract.
   * @param hash The hash of the signed data.
   * @param r The first 32 bytes of the signature.
   * @param vs The last 32 bytes of the signature, with the last byte being the recovery id.
   * @return success True if the signature is valid according to EIP-1271, false otherwise.
   */
  function isValidSignature(
    address signer,
    bytes32 hash,
    bytes32 r,
    bytes32 vs
  ) internal view returns (bool success) {
    // (bool success, bytes memory data) = signer.staticcall(abi.encodeWithSelector(IERC1271.isValidSignature.selector, hash, abi.encodePacked(r, vs)));
    // return success && data.length == 32 && abi.decode(data, (bytes4)) == IERC1271.isValidSignature.selector;
    bytes4 selector = IERC1271.isValidSignature.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      mstore(ptr, selector)
      mstore(add(ptr, 0x04), hash)
      mstore(add(ptr, 0x24), 0x40)
      mstore(add(ptr, 0x44), 64)
      mstore(add(ptr, 0x64), r)
      mstore(add(ptr, 0x84), vs)
      if staticcall(gas(), signer, ptr, 0xa4, 0, 0x20) {
        success := and(eq(selector, mload(0)), eq(returndatasize(), 0x20))
      }
    }
  }

  /**
   * @notice Verifies if a 65-byte signature is valid for a given hash, according to EIP-1271.
   * @param signer The address of the signer to validate against, which could be an EOA or a contract.
   * @param hash The hash of the signed data.
   * @param r The first 32 bytes of the signature.
   * @param vs The combined `v` (recovery id) and `s` component of the signature, packed into the last 32 bytes.
   * @return success True if the signature is valid according to EIP-1271, false otherwise.
   */
  function isValidSignature65(
    address signer,
    bytes32 hash,
    bytes32 r,
    bytes32 vs
  ) internal view returns (bool success) {
    // (bool success, bytes memory data) = signer.staticcall(abi.encodeWithSelector(IERC1271.isValidSignature.selector, hash, abi.encodePacked(r, vs & ~uint256(1 << 255), uint8(vs >> 255))));
    // return success && data.length == 32 && abi.decode(data, (bytes4)) == IERC1271.isValidSignature.selector;
    bytes4 selector = IERC1271.isValidSignature.selector;
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)

      mstore(ptr, selector)
      mstore(add(ptr, 0x04), hash)
      mstore(add(ptr, 0x24), 0x40)
      mstore(add(ptr, 0x44), 65)
      mstore(add(ptr, 0x64), r)
      mstore(add(ptr, 0x84), and(vs, _COMPACT_S_MASK))
      mstore8(add(ptr, 0xa4), add(27, shr(_COMPACT_V_SHIFT, vs)))
      if staticcall(gas(), signer, ptr, 0xa5, 0, 0x20) {
        success := and(eq(selector, mload(0)), eq(returndatasize(), 0x20))
      }
    }
  }

  /**
   * @notice Generates a hash compatible with Ethereum's signed message format.
   * @dev Prepends the hash with Ethereum's message prefix before hashing it.
   * @param hash The hash of the data to sign.
   * @return res The Ethereum signed message hash.
   */
  function toEthSignedMessageHash(
    bytes32 hash
  ) internal pure returns (bytes32 res) {
    // 32 is the length in bytes of hash, enforced by the type signature above
    // return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      mstore(
        0,
        0x19457468657265756d205369676e6564204d6573736167653a0a333200000000
      ) // "\x19Ethereum Signed Message:\n32"
      mstore(28, hash)
      res := keccak256(0, 60)
    }
  }

  /**
   * @notice Generates an EIP-712 compliant hash.
   * @dev Encodes the domain separator and the struct hash according to EIP-712.
   * @param domainSeparator The EIP-712 domain separator.
   * @param structHash The EIP-712 struct hash.
   * @return res The EIP-712 compliant hash.
   */
  function toTypedDataHash(
    bytes32 domainSeparator,
    bytes32 structHash
  ) internal pure returns (bytes32 res) {
    // return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    assembly ("memory-safe") {
      // solhint-disable-line no-inline-assembly
      let ptr := mload(0x40)
      mstore(
        ptr,
        0x1901000000000000000000000000000000000000000000000000000000000000
      ) // "\x19\x01"
      mstore(add(ptr, 0x02), domainSeparator)
      mstore(add(ptr, 0x22), structHash)
      res := keccak256(ptr, 66)
    }
  }
}
