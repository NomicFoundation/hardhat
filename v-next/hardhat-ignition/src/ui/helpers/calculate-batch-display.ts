import { UiFuture, UiFutureStatusType, UiState } from "../types.js";

export function calculateBatchDisplay(state: UiState): {
  text: string;
  height: number;
} {
  const batch = state.batches[state.currentBatch - 1];
  const height = batch.length + (state.ledgerMessageIsDisplayed ? 4 : 2);

  let text = `Batch #${state.currentBatch}\n`;

  text += batch
    .sort((a, b) => a.futureId.localeCompare(b.futureId))
    .map((v) => _futureStatus(v, state.gasBumps, state.maxFeeBumps))
    .join("\n");

  text += "\n";

  if (state.ledger) {
    text += `\n  Ledger: ${state.ledgerMessage}\n`;
  }

  return { text, height };
}

function _futureStatus(
  future: UiFuture,
  gasBumps: Record<string, number>,
  maxFeeBumps: number,
): string {
  switch (future.status.type) {
    case UiFutureStatusType.UNSTARTED: {
      const gas = gasBumps[future.futureId];
      return `  Executing ${future.futureId}${
        gas !== undefined
          ? ` - bumping gas fee (${gas}/${maxFeeBumps})...`
          : "..."
      }`;
    }
    case UiFutureStatusType.SUCCESS: {
      return `  Executed ${future.futureId}`;
    }
    case UiFutureStatusType.TIMEDOUT: {
      return `  Timed out ${future.futureId}`;
    }
    case UiFutureStatusType.ERRORED: {
      return `  Failed ${future.futureId}`;
    }
    case UiFutureStatusType.HELD: {
      return `  Held ${future.futureId}`;
    }
  }
}
