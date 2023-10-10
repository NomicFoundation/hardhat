import { UiFuture, UiFutureStatusType, UiState } from "../types";

export function redisplayBatch(state: UiState): void {
  if (state.currentBatch === 0) {
    return;
  }

  const batch = state.batches[state.currentBatch - 1];
  const panelHeight = batch.length + 3;

  process.stdout.moveCursor(0, -panelHeight);
  process.stdout.clearScreenDown();

  displayBatch(state);
}

/**
 * Display the current batch.
 *
 * @param state - the UI state
 * @param clearCurrent - whether to write over the current batch
 */
export function displayBatch(state: UiState): void {
  if (state.currentBatch === 0) {
    return;
  }

  const batch = state.batches[state.currentBatch - 1];

  console.log(`Batch #${state.currentBatch}`);
  console.log("");

  for (const future of batch.sort((a, b) =>
    a.futureId.localeCompare(b.futureId)
  )) {
    console.log(_futureStatus(future));
  }

  console.log("");
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
      return `  ${future.futureId} timed out`;
    }
    case UiFutureStatusType.ERRORED: {
      return `  ${future.futureId} failed`;
    }
    case UiFutureStatusType.HELD: {
      return `  ${future.futureId} held`;
    }
  }
}
