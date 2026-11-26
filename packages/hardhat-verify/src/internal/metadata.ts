import type { SemverVersion } from "@nomicfoundation/hardhat-utils/fast-semver";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import {
  getUnprefixedHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";
import { decode } from "cbor2";

const log = createDebug("hardhat:verify:metadata");

export const METADATA_LENGTH_FIELD_SIZE = 2;

/**
 * The Solidity compiler version inferred from a contract's bytecode metadata.
 * Solidity introduced metadata in v0.4.7 and the version field in v0.5.9.
 * Bytecode without metadata may also come from a modern compiler with CBOR
 * metadata disabled.
 */
export type InferredSolcVersion =
  | { type: "exact"; version: SemverVersion }
  | { type: "between"; min: SemverVersion; max: SemverVersion }
  | { type: "unknown" };

interface ParsedBytecode {
  executableSection: string;
  solcVersion: InferredSolcVersion;
}

/**
 * Strips a recognized Solidity CBOR section from the end of the bytecode.
 * Only the suffix is decoded, so the executable code may contain unlinked
 * library placeholders.
 */
export function parseBytecodeMetadata(bytecode: string): ParsedBytecode {
  const rawBytecode = getUnprefixedHexString(bytecode);

  return (
    decodeSolcMetadata(rawBytecode) ?? {
      executableSection: rawBytecode,
      solcVersion: { type: "unknown" },
    }
  );
}

function decodeSolcMetadata(bytecode: string): ParsedBytecode | undefined {
  // The final two bytes give the size of the CBOR payload in bytes.
  const lengthFieldStart = bytecode.length - METADATA_LENGTH_FIELD_SIZE * 2;
  const lengthField = bytecode.slice(lengthFieldStart);
  if (!/^[0-9a-f]{4}$/i.test(lengthField)) {
    return undefined;
  }

  const metadataStart = lengthFieldStart - Number.parseInt(lengthField, 16) * 2;
  if (metadataStart < 0 || metadataStart === lengthFieldStart) {
    return undefined;
  }

  let metadata: unknown;
  try {
    const payload = hexStringToBytes(
      bytecode.slice(metadataStart, lengthFieldStart),
    );
    metadata = decode(payload, { preferMap: true });
  } catch {
    log("Failed to decode metadata.");
    return undefined;
  }

  if (!(metadata instanceof Map)) {
    return undefined;
  }

  const solcVersion = inferSolcVersion(metadata);
  if (solcVersion === undefined) {
    return undefined;
  }

  return {
    executableSection: bytecode.slice(0, metadataStart),
    solcVersion,
  };
}

function inferSolcVersion(
  metadata: Map<unknown, unknown>,
): InferredSolcVersion | undefined {
  const solc = metadata.get("solc");
  if (solc instanceof Uint8Array && solc.length === 3) {
    const [major, minor, patch] = solc;
    return { type: "exact", version: [major, minor, patch] };
  }

  // Pre-release compilers store their full version as a string.
  if (typeof solc === "string" && /^\d+\.\d+\.\d+-/.test(solc)) {
    return { type: "unknown" };
  }

  // Solidity 0.4.7 through 0.5.8 stored a Swarm hash without a version.
  const bzzr0 = metadata.get("bzzr0");
  if (
    solc === undefined &&
    bzzr0 instanceof Uint8Array &&
    bzzr0.length === 32
  ) {
    return { type: "between", min: [0, 4, 7], max: [0, 5, 8] };
  }

  return undefined;
}

export function formatInferredSolcVersion(v: InferredSolcVersion): string {
  switch (v.type) {
    case "exact":
      return formatTuple(v.version);
    case "between":
      return `${formatTuple(v.min)} - ${formatTuple(v.max)}`;
    case "unknown":
      return "unknown";
  }
}

function formatTuple(v: SemverVersion): string {
  return `${v[0]}.${v[1]}.${v[2]}`;
}
