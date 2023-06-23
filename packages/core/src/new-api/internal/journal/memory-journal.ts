import { Journal, JournalableMessage } from "../../types/journal";

import { deserializeReplacer } from "./utils/deserialize-replacer";
import { serializeReplacer } from "./utils/serialize-replacer";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private messages: string[] = [];

  public record(message: JournalableMessage): void {
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
}
