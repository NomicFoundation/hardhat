import type { DeployStateExecutionCommand } from "./deployment";

export interface JournalEntry {
  txHash: string;
  blockNumberWhenSent: number;
}

/**
 * A journal keeps track of all the transactions sent during a deployment. If a
 * deployment is interrupted and resumed later for any reason, the journal can
 * then be used to avoid re-sending transactions if possible.
 */
export interface Journal {
  addEntry(
    moduleId: string,
    executorId: string,
    entry: JournalEntry
  ): Promise<number>;
  getEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number
  ): Promise<JournalEntry | undefined>;
  replaceEntry(
    moduleId: string,
    executorId: string,
    entryIndex: number,
    entry: JournalEntry
  ): Promise<void>;
  delete(moduleId: string): Promise<void>;
}

/**
 * An adapter to record and retrieve a transaction log of deployment state
 * changes.
 *
 * @internal
 */
export interface ICommandJournal {
  /**
   * Store a record of the given command
   * @param command - The deployment update command to record
   *
   * @internal
   */
  record(command: DeployStateExecutionCommand): Promise<void>;

  /**
   * Read out the stored deployment update commands.
   */
  read(): AsyncGenerator<DeployStateExecutionCommand, void, unknown>;
}
