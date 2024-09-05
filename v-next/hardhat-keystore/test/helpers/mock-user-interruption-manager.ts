import type { UserInterruptionManager } from "@ignored/hardhat-vnext/types/user-interruptions";

export class MockUserInterruptionManager implements UserInterruptionManager {
  public output: string;

  constructor() {
    this.output = "";
  }

  public async displayMessage(
    _interruptor: string,
    message: string,
  ): Promise<void> {
    this.output += message + "\n";
  }

  public async requestSecretInput(
    _interruptor: string,
    _inputDescription: string,
  ): Promise<string> {
    return "fake-password";
  }

  public async requestInput(
    _interruptor: string,
    _inputDescription: string,
  ): Promise<string> {
    return "fake-input";
  }

  public async uninterrupted<ReturnT>(
    _f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    throw new Error("Uninterrupted not implemented for mock");
  }
}
