import type { EthereumProvider } from "hardhat/types/providers";
import type { CompilerOutputBytecode } from "hardhat/types/solidity";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  getUnprefixedHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";

import {
  getMetadataSectionBytesLength,
  inferSolcVersion,
  METADATA_LENGTH_FIELD_SIZE,
  MISSING_METADATA_VERSION_RANGE,
  SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE,
} from "./metadata.js";

interface ByteOffset {
  start: number;
  length: number;
}

export class Bytecode {
  readonly #executableSection: string;

  private constructor(
    public readonly bytecode: string,
    public readonly solcVersion: string,
    executableSection: string,
  ) {
    this.#executableSection = executableSection;
  }

  static async #parse(bytecode: string): Promise<Bytecode> {
    const bytecodeBytes = hexStringToBytes(bytecode);

    const solcVersion = await inferSolcVersion(bytecodeBytes);
    const executableSection = bytecode.slice(
      0,
      bytecode.length - getMetadataSectionBytesLength(bytecodeBytes) * 2,
    );

    return new Bytecode(bytecode, solcVersion, executableSection);
  }

  public static async getDeployedContractBytecode(
    provider: EthereumProvider,
    address: string,
    networkName: string,
  ): Promise<Bytecode> {
    const response = await provider.request({
      method: "eth_getCode",
      params: [address, "latest"],
    });
    assertHardhatInvariant(
      typeof response === "string",
      "eth_getCode response is not a string",
    );
    const deployedBytecode = getUnprefixedHexString(response);

    if (deployedBytecode === "") {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_NOT_FOUND,
        {
          address,
          networkName,
        },
      );
    }

    return Bytecode.#parse(deployedBytecode);
  }

  public hasVersionRange(): boolean {
    return (
      this.solcVersion === MISSING_METADATA_VERSION_RANGE ||
      this.solcVersion === SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE
    );
  }

  /**
   * Compares the executable sections of the deployed and compiled bytecode,
   * ignoring differences in metadata, library link references, immutable
   * variables, and call protection placeholders.
   *
   * This is necessary because deployed bytecode contains dynamically inserted
   * values (e.g. actual library addresses), while the compiler output contains
   * placeholders. To make the comparison meaningful, both bytecode strings are
   * normalized before comparison.
   *
   * See: https://ethereum.org/en/developers/docs/smart-contracts/verifying/#etherscan
   *
   * @param compilerOutputBytecode The `evm.deployedBytecode` section of a
   * compiled contract.
   * @returns `true` if the normalized deployed and compiled bytecode are
   * equivalent, `false` otherwise.
   */
  public compare(compilerOutputBytecode: CompilerOutputBytecode): boolean {
    const unlinkedExecutableSection = inferExecutableSection(
      compilerOutputBytecode.object,
    );

    // If the lengths differ, the bytecodes cannot match, so we can return early
    if (this.#executableSection.length !== unlinkedExecutableSection.length) {
      return false;
    }

    const normalizedBytecode = nullifyBytecodeOffsets(
      this.#executableSection,
      compilerOutputBytecode,
    );

    const normalizedUnlinkedBytecode = nullifyBytecodeOffsets(
      unlinkedExecutableSection,
      compilerOutputBytecode,
    );

    return normalizedBytecode === normalizedUnlinkedBytecode;
  }
}

/**
 * Extracts the executable portion of a contract's bytecode without
 * decoding it.
 *
 * Solidity appends metadata to the end of the bytecode. This metadata
 * includes a two-byte field indicating its total length. This function
 * removes that metadata segment and returns only the executable code.
 *
 * This approach avoids decoding issues that can occur if the bytecode
 * includes linker placeholders or non-hex characters.
 *
 * @param bytecode The full contract bytecode as a hex string
 * (with or without `0x` prefix).
 * @returns The hex string of the executable code, excluding metadata.
 */
export function inferExecutableSection(bytecode: string): string {
  const rawBytecode = getUnprefixedHexString(bytecode);

  // Read the last 2 bytes (4 hex chars) that encode the length of
  // the metadata section.
  const metadataLengthBytes = hexStringToBytes(
    rawBytecode.slice(-METADATA_LENGTH_FIELD_SIZE * 2),
  );

  // If the bytecode is too short to contain a metadata length field,
  // return the entire bytecode.
  if (metadataLengthBytes.length !== METADATA_LENGTH_FIELD_SIZE) {
    return rawBytecode;
  }

  const metadataSectionLength =
    getMetadataSectionBytesLength(metadataLengthBytes);

  // invalid length (metadata + length field doesn't fit)
  if (metadataSectionLength * 2 > rawBytecode.length) {
    return rawBytecode;
  }

  return rawBytecode.slice(0, rawBytecode.length - metadataSectionLength * 2);
}

/**
 * Replaces all known dynamic offset segments in the bytecode with zeros.
 *
 * These segments include:
 * - Library link references (placeholders for external addresses).
 * - Immutable variable references (set during deployment).
 * - Call protection patterns (used for things like delegatecall guards).
 *
 * This is useful for comparing or analyzing bytecode in a normalized form,
 * ignoring dynamic values.
 *
 * @param bytecode The bytecode executable section as a hex string (without
 * `0x` prefix).
 * @param compilerOutputBytecode The reference compiler output containing
 * known offset positions.
 * @returns The bytecode string with all known dynamic offsets zeroed out.
 */
export function nullifyBytecodeOffsets(
  bytecode: string,
  {
    object: unlinkedBytecode,
    linkReferences,
    immutableReferences,
  }: CompilerOutputBytecode,
): string {
  const dynamicOffsets = [
    ...getLibraryOffsets(linkReferences),
    ...getImmutableOffsets(immutableReferences),
    ...getCallProtectionOffsets(bytecode, unlinkedBytecode),
  ];

  const bytecodeChars = [...bytecode];
  for (const { start, length } of dynamicOffsets) {
    bytecodeChars.fill("0", start * 2, (start + length) * 2);
  }

  return bytecodeChars.join("");
}

/**
 * Extracts all bytecode offsets where libraries are expected to be linked.
 *
 * Solidity organizes link references as a nested object:
 * `{ sourceFile: { libraryName: [{ start, length }, ...] } }`.
 * This function flattens that structure and returns a single list
 * of offsets where linking placeholders are present.
 *
 * @param linkReferences The link references object from compiler output.
 * @returns An array of byte offsets for all library link placeholders.
 */
export function getLibraryOffsets(
  linkReferences: CompilerOutputBytecode["linkReferences"] = {},
): ByteOffset[] {
  return Object.values(linkReferences).flatMap((libraries) =>
    Object.values(libraries).flat(),
  );
}

/**
 * Extracts all bytecode offsets where immutable variables are used.
 *
 * Immutable variables are inserted into the bytecode at deployment time,
 * and the compiler emits their positions in `immutableReferences`.
 *
 * @param immutableReferences Immutable references from compiler output.
 * @returns An array of byte offsets where immutable values will be written.
 */
export function getImmutableOffsets(
  immutableReferences: CompilerOutputBytecode["immutableReferences"] = {},
): ByteOffset[] {
  return Object.values(immutableReferences).flat();
}

/**
 * Detects and returns the offset of the call protection pattern in a library
 * bytecode.
 *
 * Solidity libraries include a call protection mechanism that starts the
 * bytecode with `PUSH20 <address>`, a placeholder address (usually all
 * zeros) that prevents direct usage.
 *
 * This function checks if the `referenceBytecode` starts with such a
 * placeholder and, if the actual `bytecode` starts with a real `PUSH20`,
 * returns the offset where the address starts (always 1).
 *
 * @param bytecode The bytecode of the contract as a hex string (without
 * `0x` prefix).
 * @param unlinkedBytecode The compiler output bytecode as a hex string
 * (without `0x` prefix).
 * @returns An array with a single offset entry if call protection is detected,
 * or an empty array otherwise.
 */
export function getCallProtectionOffsets(
  bytecode: string,
  unlinkedBytecode: string,
): ByteOffset[] {
  const PUSH20_OPCODE = "73";
  const ADDRESS_LENGTH = 20;

  const hasPlaceholderPrefix = unlinkedBytecode.startsWith(
    PUSH20_OPCODE + "0".repeat(ADDRESS_LENGTH * 2),
  );
  const hasRealPrefix = bytecode.startsWith(PUSH20_OPCODE);

  if (hasPlaceholderPrefix && hasRealPrefix) {
    return [{ start: 1, length: ADDRESS_LENGTH }];
  }

  return [];
}
