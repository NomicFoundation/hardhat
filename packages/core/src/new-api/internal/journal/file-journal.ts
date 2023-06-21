import { IgnitionError } from "../../../errors";
import { Journal, JournalableMessage } from "../../types/journal";

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
