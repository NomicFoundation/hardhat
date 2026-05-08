import type { SemverVersion } from "@nomicfoundation/hardhat-utils/fast-semver";

import util from "node:util";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { decode } from "cbor2";

const log = createDebug("hardhat:verify:metadata");

export const METADATA_LENGTH_FIELD_SIZE = 2;

/**
 * The Solidity compiler version inferred from a contract's deployed bytecode.
 *
 * Bytecode metadata was introduced in Solidity v0.4.7, and the explicit
 * version field was added in v0.5.9. Below those thresholds we can only
 * narrow the version down to a range.
 */
export type InferredSolcVersion =
  | { type: "exact"; version: SemverVersion }
  | { type: "lessThan"; bound: SemverVersion }
  | { type: "between"; min: SemverVersion; max: SemverVersion };

const MISSING_METADATA: InferredSolcVersion = {
  type: "lessThan",
  bound: [0, 4, 7],
};

const SOLC_NOT_FOUND_IN_METADATA: InferredSolcVersion = {
  type: "between",
  min: [0, 4, 7],
  max: [0, 5, 8],
};

/**
 * Attempts to infer the Solidity compiler version from the bytecode metadata.
 *
 * - Metadata was introduced in Solidity v0.4.7.
 * See: https://docs.soliditylang.org/en/v0.4.7/miscellaneous.html#contract-metadata
 * - The version field was first added in v0.5.9.
 * See https://docs.soliditylang.org/en/v0.5.9/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
 *
 * @param bytecode The deployed bytecode as a Uint8Array.
 * @returns The inferred solc version, either as an exact `x.y.z` or, when
 * the metadata is missing or incomplete, as a fallback range.
 */
export async function inferSolcVersion(
  bytecode: Uint8Array,
): Promise<InferredSolcVersion> {
  let solcMetadata: unknown;
  try {
    solcMetadata = await decodeSolcMetadata(bytecode);
  } catch {
    // Decoding failed, likely an older compiler or non-Solidity bytecode
    log("Failed to decode metadata.");
    return MISSING_METADATA;
  }

  if (solcMetadata instanceof Uint8Array) {
    if (solcMetadata.length === 3) {
      const [major, minor, patch] = solcMetadata;
      log(
        `Detected Solidity version from metadata: ${major}.${minor}.${patch}`,
      );
      return { type: "exact", version: [major, minor, patch] };
    }
    // Unexpected length. Log raw metadata for inspection
    log(
      `Unexpected metadata version format: [${[...solcMetadata].join(", ")}]`,
    );
  }

  // Metadata was decoded but contained no version field
  log("Metadata decoded but Solidity version not found.");
  return SOLC_NOT_FOUND_IN_METADATA;
}

/**
 * Formats an `InferredSolcVersion` as a human-readable string suitable for
 * inclusion in error messages: an exact `x.y.z`, a `<x.y.z` upper bound, or
 * an `x.y.z - x.y.z` closed range.
 */
export function formatInferredSolcVersion(v: InferredSolcVersion): string {
  switch (v.type) {
    case "exact":
      return formatTuple(v.version);
    case "lessThan":
      return `<${formatTuple(v.bound)}`;
    case "between":
      return `${formatTuple(v.min)} - ${formatTuple(v.max)}`;
  }
}

function formatTuple(v: SemverVersion): string {
  return `${v[0]}.${v[1]}.${v[2]}`;
}

/**
 * Reads the Solidity metadata section length from the end of the contract
 * bytecode.
 *
 * Solidity appends metadata to the end of the deployed bytecode.
 * The final 2 bytes (defined by METADATA_LENGTH) encode the length of the
 * metadata section, using a big-endian unsigned 16-bit integer.
 * See https://docs.soliditylang.org/en/latest/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
 *
 * This function uses a DataView to read those final 2 bytes, and returns the
 * total length of the metadata section (payload + length field).
 *
 * @param bytecode The bytecode as an Uint8Array.
 * @returns The total length (in bytes) of the metadata section at the end of
 * the bytecode.
 */
export function getMetadataSectionBytesLength(bytecode: Uint8Array): number {
  const view = new DataView(
    bytecode.buffer,
    bytecode.byteOffset + bytecode.byteLength - METADATA_LENGTH_FIELD_SIZE,
    METADATA_LENGTH_FIELD_SIZE,
  );

  return view.getUint16(0, false) + METADATA_LENGTH_FIELD_SIZE;
}

/**
 * Decodes the CBOR metadata from the given bytecode and returns the `solc`
 * version field. The function throws if the metadata cannot be decoded.
 */
async function decodeSolcMetadata(bytecode: Uint8Array): Promise<unknown> {
  const metadataSectionBytesLength = getMetadataSectionBytesLength(bytecode);
  const metadataPayload = bytecode.slice(
    -metadataSectionBytesLength,
    -METADATA_LENGTH_FIELD_SIZE,
  );

  log(`Read metadata section length: ${metadataSectionBytesLength} bytes`);

  const lastBytes = metadataPayload.slice(-100);
  log(
    `Last ${lastBytes.length} bytes of metadata: ${bytesToHexString(lastBytes)}`,
  );

  const decodedMetadata = decode(metadataPayload);
  log(`Metadata decoded: ${util.inspect(decodedMetadata)}`);

  // @ts-expect-error: the metadata is known to contain a `solc` field
  return decodedMetadata.solc;
}
