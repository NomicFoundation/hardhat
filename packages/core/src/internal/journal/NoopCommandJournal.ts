import type { DeployStateExecutionCommand } from "../types/deployment";
import type { ICommandJournal } from "../types/journal";

export class NoopCommandJournal implements ICommandJournal {
  public async record(_command: DeployStateExecutionCommand): Promise<void> {
    return;
  }

  public read(): AsyncGenerator<DeployStateExecutionCommand, void, unknown> {
    return fakeRead();
  }

  public readAll(): AsyncGenerator<
    DeployStateExecutionCommand & { chainId: number },
    void,
    unknown
  > {
    return fakeRead();
  }
}

async function* fakeRead() {
  return;
}
