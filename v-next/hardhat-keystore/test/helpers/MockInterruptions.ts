import type { RawInterruptions } from "../../src/types.js";
import type { Mock } from "node:test";

import { mock } from "node:test";

export class MockInterruptions implements RawInterruptions {
  public info: Mock<(message: string) => void> = mock.fn(
    (_msg: string): void => {},
  );
  public warn: Mock<(message: string) => void> = mock.fn(
    (_msg: string): void => {},
  );
  public error: Mock<(message: string) => void> = mock.fn(
    (_msg: string): void => {},
  );
  public requestSecretInput = (): Promise<string> =>
    Promise.resolve("password");
}
