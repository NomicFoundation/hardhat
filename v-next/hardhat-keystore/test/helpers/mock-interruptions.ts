import type { RawInterruptions } from "../../src/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

export class MockInterruptions implements RawInterruptions {
  public info: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public warn: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public error: Mock<(message: string) => Promise<void>> = mock.fn(
    async (_msg: string): Promise<void> => {},
  );

  public requestSecretInput = async (): Promise<string> => {
    return "password";
  };
}
