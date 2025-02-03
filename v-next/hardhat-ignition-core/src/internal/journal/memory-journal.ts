import type { Journal } from "./types/index.js";
import type { ExecutionEventListener } from "../../types/execution-events.js";
import type { JournalMessage } from "../execution/types/messages.js";

import { emitExecutionEvent } from "./utils/emitExecutionEvent.js";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private readonly _messages: JournalMessage[] = [];

  constructor(
    private readonly _executionEventListener?:
      | ExecutionEventListener
      | undefined,
  ) {}

  public record(message: JournalMessage): void {
    this._log(message);

    this._messages.push(message);
  }

  public async *read(): AsyncGenerator<JournalMessage> {
    for (const message of this._messages) {
      yield message;
    }
  }

  private _log(message: JournalMessage): void {
    if (this._executionEventListener !== undefined) {
      emitExecutionEvent(message, this._executionEventListener);
    }
  }
}
