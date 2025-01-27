import { ExecutionEventListener } from "../../types/execution-events";
import { JournalMessage } from "../execution/types/messages";

import { Journal } from "./types";
import { emitExecutionEvent } from "./utils/emitExecutionEvent";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private _messages: JournalMessage[] = [];

  constructor(
    private _executionEventListener?: ExecutionEventListener | undefined,
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
