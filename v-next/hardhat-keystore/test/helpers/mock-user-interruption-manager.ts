import type { UserInterruptionManager } from "@ignored/hardhat-vnext/types/user-interruptions";
import type { Mock } from "node:test";

import { mock } from "node:test";

export class MockUserInterruptionManager implements UserInterruptionManager {
  public displayMessage: Mock<
    (interruptor: string, message: string) => Promise<void>
  > = mock.fn();

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
