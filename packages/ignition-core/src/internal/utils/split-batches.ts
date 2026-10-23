import { HardhatError } from "@nomicfoundation/hardhat-errors";

export function validateMaxBatchSize(maxBatchSize: number | undefined): void {
  if (
    maxBatchSize !== undefined &&
    (!Number.isSafeInteger(maxBatchSize) || maxBatchSize <= 0)
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.GENERAL.INVALID_MAX_BATCH_SIZE,
      { value: String(maxBatchSize) },
    );
  }
}

export function splitBatches(
  batches: string[][],
  maxBatchSize: number | undefined,
): string[][] {
  validateMaxBatchSize(maxBatchSize);

  if (maxBatchSize === undefined) {
    return batches;
  }

  return batches.flatMap((batch) => {
    const chunks: string[][] = [];
    for (let start = 0; start < batch.length; start += maxBatchSize) {
      chunks.push(batch.slice(start, start + maxBatchSize));
    }
    return chunks;
  });
}
