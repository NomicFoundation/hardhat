import type { ConsoleWrapper } from "../../src/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

export class MockConsoleWrapper implements ConsoleWrapper {
  public info: Mock<(message: string) => void> = mock.fn();
  public error: Mock<(message: string) => void> = mock.fn();
  public warn: Mock<(message: string) => void> = mock.fn();

  public async requestSecretInput(_inputDescription: string): Promise<string> {
    return "fake-password";
  }
}
