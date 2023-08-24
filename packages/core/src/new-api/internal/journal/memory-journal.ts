import { UiEventEmitter } from "../../types/ui-events";
import { JournalMessage } from "../new-execution/types/messages";

import { Journal } from "./types";
import { emitUiEvent } from "./utils/emitUiEvent";
import { logJournalableMessage } from "./utils/log";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private messages: JournalMessage[] = [];

  constructor(
    private _verbose: boolean = false,
    private _uiEventEmitter: UiEventEmitter
  ) {}

  public record(message: JournalMessage): void {
    this._log(message);

    this.messages.push(message);
  }

  public async *read(): AsyncGenerator<JournalMessage> {
    for (const message of this.messages) {
      yield message;
    }
  }

  private _log(message: JournalMessage): void {
    if (this._verbose) {
      logJournalableMessage(message);
    }

    emitUiEvent(message, this._uiEventEmitter);
  }
}
