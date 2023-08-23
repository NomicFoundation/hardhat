// eslint-disable-next-line import/default
import type CborT from "cbor";

import { Future, ModuleParameterType } from "../../types/module";

import {
  ReconciliationFutureResult,
  ReconciliationFutureResultFailure,
} from "./types";

export function fail(
  future: Future,
  failure: string
): ReconciliationFutureResultFailure {
  return {
    success: false,
    failure: {
      futureId: future.id,
      failure,
    },
  };
}

export function failWithError(
  future: Future,
  error: unknown
): ReconciliationFutureResult {
  return {
    success: false,
    failure: {
      futureId: future.id,
      failure:
        error instanceof Error
          ? error.message
          : "unknown failure during reconciliation",
    },
  };
}

export function moduleParameterToErrorString(potential: ModuleParameterType) {
  return JSON.stringify(potential);
}

export function addressToErrorString(potential: string | undefined) {
  if (potential === undefined) {
    return "undefined";
  }

  return potential;
}

const METADATA_LENGTH = 2;
function getMetadataSectionLength(bytecode: Buffer): number {
  return bytecode.slice(-METADATA_LENGTH).readUInt16BE(0) + METADATA_LENGTH;
}

function isValidMetadata(data: Buffer): boolean {
  const { decode } = require("cbor") as typeof CborT;
  try {
    decode(data);
    return true;
  } catch (e) {
    return false;
  }
}

export function getBytecodeWithoutMetadata(bytecode: string): string {
  const bytecodeBuffer = Buffer.from(bytecode.slice(2), "hex");
  const metadataSectionLength = getMetadataSectionLength(bytecodeBuffer);

  const metadataPayload = bytecodeBuffer.slice(
    -metadataSectionLength,
    -METADATA_LENGTH
  );

  if (isValidMetadata(metadataPayload)) {
    return bytecodeBuffer.slice(0, -metadataSectionLength).toString("hex");
  }

  return bytecode;
}
