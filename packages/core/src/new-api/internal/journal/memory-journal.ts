import { Journal, JournalableMessage } from "../../types/journal";

import { deserializeReplacer } from "./utils/deserialize-replacer";
import { logJournalableMessage } from "./utils/log";
import { serializeReplacer } from "./utils/serialize-replacer";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private messages: string[] = [];

  constructor(private _verbose: boolean = false) {}

  public record(message: JournalableMessage): void {
    this._log(message);

    this.messages.push(JSON.stringify(message, serializeReplacer.bind(this)));
  }

  public async *read(): AsyncGenerator<JournalableMessage> {
    for (const entry of this.messages) {
      const message: JournalableMessage = JSON.parse(
        entry,
        deserializeReplacer.bind(this)
      );

      yield message;
    }
  }

  private _log(message: JournalableMessage): void {
    if (this._verbose) {
      return logJournalableMessage(message);
    }
  }
}
