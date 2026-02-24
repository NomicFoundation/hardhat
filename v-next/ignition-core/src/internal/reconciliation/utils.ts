import type { ReconciliationFutureResultFailure } from "./types.js";
import type { Future } from "../../types/module.js";

import { decode } from "cbor2";

export function fail(
  future: Future,
  failure: string,
): ReconciliationFutureResultFailure {
  return {
    success: false,
    failure: {
      futureId: future.id,
      failure,
    },
  };
}

const METADATA_LENGTH = 2;
function getMetadataSectionLength(bytecode: Buffer): number | undefined {
  try {
    return bytecode.slice(-METADATA_LENGTH).readUInt16BE(0) + METADATA_LENGTH;
  } catch {
    return undefined;
  }
}

function isValidMetadata(data: Buffer): boolean {
  try {
    decode(data);
    return true;
  } catch (_error) {
    return false;
  }
}

export function getBytecodeWithoutMetadata(bytecode: string): string {
  const bytecodeBuffer = Buffer.from(bytecode.slice(2), "hex");
  const metadataSectionLength = getMetadataSectionLength(bytecodeBuffer);

  if (metadataSectionLength === undefined) {
    return bytecode;
  }

  const metadataPayload = bytecodeBuffer.slice(
    -metadataSectionLength,
    -METADATA_LENGTH,
  );

  if (isValidMetadata(metadataPayload)) {
    return bytecodeBuffer.slice(0, -metadataSectionLength).toString("hex");
  }

  return bytecode;
}
