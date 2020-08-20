import { NomicLabsBuidlerPluginError } from "@nomiclabs/buidler/plugins";

import { pluginName } from "../pluginContext";

import { SolcVersionNumber } from "./version";

export const METADATA_LENGTH_SIZE = 2;

// Instances of these errors are not supposed to be seen by the task.
export class VersionNotFoundError extends NomicLabsBuidlerPluginError {
  constructor(message: string) {
    super(pluginName, message, undefined, true);
    Object.setPrototypeOf(this, VersionNotFoundError.prototype);
  }
}

export class MetadataAbsentError extends NomicLabsBuidlerPluginError {
  constructor(message: string) {
    super(pluginName, message, undefined, true);
    Object.setPrototypeOf(this, MetadataAbsentError.prototype);
  }
}

export async function readSolcVersion(
  bytecode: Buffer
) /*: Promise<SolcVersionNumber>*/ {
  let solcMetadata;
  try {
    solcMetadata = (await decodeSolcMetadata(bytecode)).solc;
  } catch (error) {
    throw new MetadataAbsentError("Could not decode metadata.");
  }
  if (solcMetadata instanceof Buffer) {
    const [major, minor, patch] = solcMetadata;
    return new SolcVersionNumber(major, minor, patch);
  }
  throw new VersionNotFoundError("Could not find solc version in metadata.");
}

export async function decodeSolcMetadata(bytecode: Buffer) {
  const metadataLength = readSolcMetadataLength(bytecode);
  // The metadata and its length are in the last few bytes.
  const metadataPayload = bytecode.slice(
    -metadataLength - METADATA_LENGTH_SIZE,
    -METADATA_LENGTH_SIZE
  );

  const { decodeFirst } = await import("cbor");
  // TODO: throw an error for decoding errors that are returned without being thrown
  // E.g. cbor.decodeFirst(Buffer.from([])) === cbor.Decoder.NOT_FOUND
  return decodeFirst(metadataPayload);
}

export function readSolcMetadataLength(bytecode: Buffer) {
  return bytecode.slice(-METADATA_LENGTH_SIZE).readUInt16BE(0);
}
