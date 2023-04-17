import { DeployStateExecutionCommand } from "../../src/internal/types/deployment";
import { ICommandJournal } from "../../src/internal/types/journal";

export class MemoryCommandJournal implements ICommandJournal {
  private entries: string[];

  constructor() {
    this.entries = [];
  }

  public async record(command: DeployStateExecutionCommand): Promise<void> {
    this.entries.push(JSON.stringify(command));
  }

  public async *read(): AsyncGenerator<
    DeployStateExecutionCommand,
    void,
    unknown
  > {
    for (const entry of this.entries) {
      const command: DeployStateExecutionCommand = JSON.parse(entry);

      yield command;
    }
  }

  public async *readAll(): AsyncGenerator<
    DeployStateExecutionCommand & { chainId: number },
    void,
    unknown
  > {
    for (const entry of this.entries) {
      const command: DeployStateExecutionCommand & { chainId: number } =
        JSON.parse(entry);

      yield command;
    }
  }

  public clear() {
    this.entries = [];
  }
}
