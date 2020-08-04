import { NomicLabsBuidlerPluginError } from "@nomiclabs/buidler/plugins";

import { pluginName } from "../pluginContext";

const twoBytes = 2;

// Instances of these errors are not supposed to be seen by the task.
export class VersionNotFoundError extends NomicLabsBuidlerPluginError {
  constructor(message: string) {
    super(pluginName, message);
  }
}

export class MetadataAbsentError extends NomicLabsBuidlerPluginError {
  constructor(message: string) {
    super(pluginName, message);
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
    const { SolcVersionNumber } = await import("./SolcVersions");
    return new SolcVersionNumber(major, minor, patch);
  }
  throw new VersionNotFoundError("Could not find solc version in metadata.");
}

export async function decodeSolcMetadata(bytecode: Buffer) {
  const metadataLength = readSolcMetadataLength(bytecode);
  // The metadata length is in the last two bytes.
  const metadataPayload = bytecode.slice(-metadataLength - twoBytes, -twoBytes);

  const { decodeFirst } = await import("cbor");
  return decodeFirst(metadataPayload);
}

export function readSolcMetadataLength(bytecode: Buffer) {
  return bytecode.slice(-twoBytes).readUInt16BE(0);
}
