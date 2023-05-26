import { IgnitionError } from "../errors";

import { Journal, JournalableMessage } from "./types/journal";

/**
 * An in-memory journal.
 *
 * @beta
 */
export class MemoryJournal implements Journal {
  private messages: string[] = [];

  public async record(message: JournalableMessage): Promise<void> {
    try {
      this.messages.push(JSON.stringify(message));
    } catch (err) {
      console.error(err, message);
    }
  }

  public async *read(): AsyncGenerator<JournalableMessage> {
    for (const entry of this.messages) {
      const message: JournalableMessage = JSON.parse(entry);

      yield message;
    }
  }
}

/**
 * An file-based journal.
 *
 * @beta
 */
export class FileJournal implements Journal {
  constructor(private _filePath: string) {}

  public async record(_message: JournalableMessage): Promise<void> {
    throw new IgnitionError("Not implemented");
  }

  public async *read(): AsyncGenerator<JournalableMessage> {
    throw new IgnitionError("Not implemented");
  }
}
