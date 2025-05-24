import util from "node:util";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";
import debug from "debug";

const log = debug("hardhat:hardhat-verify:metadata");

export const METADATA_LENGTH_FIELD_SIZE = 2;

export const SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE = "0.4.7 - 0.5.8";

export const MISSING_METADATA_VERSION_RANGE = "<0.4.7";

/**
 * Attempts to infer the Solidity compiler version from the bytecode metadata.
 *
 * - Metadata was introduced in Solidity v0.4.7.
 * See: https://docs.soliditylang.org/en/v0.4.7/miscellaneous.html#contract-metadata
 * - The version field was first added in v0.5.9.
 * See https://docs.soliditylang.org/en/v0.4.26/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
 * - Version info is consistently available from v0.6.0 onwards.
 * See https://docs.soliditylang.org/en/v0.5.9/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
 *
 * @param bytecode The deployed bytecode as a Uint8Array.
 * @returns The inferred solc version (e.g., "0.8.17"), or a fallback
 * version range constant if the version cannot be inferred.
 */
export async function inferSolcVersion(bytecode: Uint8Array): Promise<string> {
  let solcMetadata: unknown;
  try {
    solcMetadata = await decodeSolcMetadata(bytecode);
  } catch {
    // Decoding failed, likely an older compiler or non-Solidity bytecode
    log("Failed to decode metadata.");
    return MISSING_METADATA_VERSION_RANGE;
  }

  if (solcMetadata instanceof Uint8Array) {
    if (solcMetadata.length === 3) {
      const [major, minor, patch] = solcMetadata;
      const solcVersion = `${major}.${minor}.${patch}`;
      log(`Detected Solidity version from metadata: ${solcVersion}`);
      return solcVersion;
    }
    // Unexpected length. Log raw metadata for inspection
    log(
      `Unexpected metadata version format: [${[...solcMetadata].join(", ")}]`,
    );
  }

  // Metadata was decoded but contained no version field
  log("Metadata decoded but Solidity version not found.");
  return SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE;
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
  const { decode } = await import("cbor2");

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
