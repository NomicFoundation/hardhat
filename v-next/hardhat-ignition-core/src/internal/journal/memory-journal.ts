import type { Journal } from "./types";
import type { ExecutionEventListener } from "../../types/execution-events";
import type { JournalMessage } from "../execution/types/messages";

import { emitExecutionEvent } from "./utils/emitExecutionEvent";

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
