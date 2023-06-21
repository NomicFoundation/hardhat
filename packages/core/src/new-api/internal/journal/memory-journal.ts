import { Journal, JournalableMessage } from "../../types/journal";

/**
 * An in-memory journal.
 *
 * @beta
 */

export class MemoryJournal implements Journal {
  private messages: string[] = [];

  public async record(message: JournalableMessage): Promise<void> {
    this.messages.push(JSON.stringify(message));
  }

  public async *read(): AsyncGenerator<JournalableMessage> {
    for (const entry of this.messages) {
      const message: JournalableMessage = JSON.parse(entry);

      yield message;
    }
  }
}
