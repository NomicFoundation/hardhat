import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  copyRequest,
  getRpcTransaction,
} from "../src/internal/ethers-utils/ethers-utils.js";

const TO = "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d";
const BLOB = `0x${"ab".repeat(32)}`;
const COMMITMENT = `0x${"cd".repeat(48)}`;
const PROOF = `0x${"ef".repeat(48)}`;
const VERSIONED_HASH = `0x01${"AB".repeat(31)}`;

const kzg = {
  blobToKZGCommitment: () => COMMITMENT,
  computeBlobKZGProof: () => PROOF,
};

describe("ethers-utils", () => {
  describe("getRpcTransaction", () => {
    it("should forward the versioned hashes of a blob transaction, like ethers", () => {
      const rpcTx = getRpcTransaction({
        type: 3,
        to: TO,
        maxFeePerBlobGas: 1n,
        blobs: [BLOB],
        blobVersionedHashes: [VERSIONED_HASH],
        kzg,
      });

      assert.deepEqual(rpcTx, {
        type: "0x3",
        to: TO,
        blobVersionedHashes: [VERSIONED_HASH.toLowerCase()],
      });
    });

    it("should not include blobVersionedHashes when absent", () => {
      const rpcTx = getRpcTransaction({ to: TO, value: 1n });

      assert.deepEqual(rpcTx, { to: TO, value: "0x1" });
    });
  });

  describe("copyRequest", () => {
    it("should copy the EIP-4844 fields", () => {
      const request = copyRequest({
        type: 3,
        to: TO,
        maxFeePerBlobGas: 1n,
        blobs: [BLOB, new Uint8Array([1, 2, 3])],
        blobVersionedHashes: [VERSIONED_HASH],
        kzg,
        blobWrapperVersion: 1,
      });

      assert.deepEqual(request, {
        type: 3,
        to: TO,
        maxFeePerBlobGas: 1n,
        blobs: [BLOB, "0x010203"],
        blobVersionedHashes: [VERSIONED_HASH],
        kzg,
        blobWrapperVersion: 1,
      });
    });

    it("should copy blobs that include their commitment and proof", () => {
      const blob = { data: BLOB, commitment: COMMITMENT, proof: PROOF };

      const request = copyRequest({ blobs: [blob] });

      assert.deepEqual(request, { blobs: [blob] });
      assert.notEqual(request.blobs?.[0], blob, "blobs should be copied");
    });
  });
});
