import { UiFuture, UiFutureStatusType, UiState } from "../types";

export function calculateBatchDisplay(state: UiState): {
  text: string;
  height: number;
} {
  const batch = state.batches[state.currentBatch - 1];
  const height = batch.length + 1;

  let text = `Batch #${state.currentBatch}\n`;

  text += batch
    .sort((a, b) => a.futureId.localeCompare(b.futureId))
    .map(_futureStatus)
    .join("\n");

  return { text, height };
}

function _futureStatus(future: UiFuture): string {
  switch (future.status.type) {
    case UiFutureStatusType.UNSTARTED: {
      return `  Executing ${future.futureId}...`;
    }
    case UiFutureStatusType.SUCCESS: {
      return `  Executed ${future.futureId}`;
    }
    case UiFutureStatusType.PENDING: {
      return `  Pending ${future.futureId}`;
    }
    case UiFutureStatusType.ERRORED: {
      return `  Failed ${future.futureId}`;
    }
    case UiFutureStatusType.HELD: {
      return `  Held ${future.futureId}`;
    }
  }
}
