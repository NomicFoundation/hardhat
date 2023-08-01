import { IgnitionError } from "../../errors";

import { executionStateReducer } from "./execution/execution-state-reducer";
import { ExecutionStateMap } from "./execution/types";
import { Journal, JournalMessageType, WipeMessage } from "./journal/types";

export class Wiper {
  constructor(private _journal: Journal) {}

  public async wipe(futureId: string) {
    const previousStateMap = await this._loadExecutionStateFrom(this._journal);

    const executionState = previousStateMap[futureId];

    if (executionState === undefined) {
      throw new IgnitionError(
        `Cannot wipe ${futureId} as no state recorded against it`
      );
    }

    const dependents = Object.values(previousStateMap).filter((psm) =>
      psm.dependencies.has(futureId)
    );

    if (dependents.length > 0) {
      throw new IgnitionError(
        `Cannot wipe ${futureId} as there are dependent futures that have already started:\n${dependents
          .map((state) => `  ${state.id}\n`)
          .join()}`
      );
    }

    const wipeMessage: WipeMessage = {
      type: JournalMessageType.WIPE,
      futureId,
    };

    return this._journal.record(wipeMessage);
  }

  private async _loadExecutionStateFrom(
    journal: Journal
  ): Promise<ExecutionStateMap> {
    let state: ExecutionStateMap = {};

    for await (const message of journal.read()) {
      state = executionStateReducer(state, message);
    }

    return state;
  }
}
