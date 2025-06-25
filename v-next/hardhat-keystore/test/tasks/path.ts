import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { Mock } from "node:test";

import { describe, it, mock } from "node:test";

import { path } from "../../src/internal/tasks/path.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";

const mockConsoleLog: Mock<(text: string) => void> = mock.fn();

describe("tasks - path", () => {
  it("should print the keystore file path", async () => {
    await path(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Simulate the config for the keystore plugin
      {
        config: {
          keystore: {
            filePath: "./fake-keystore-path.json",
          },
        },
      } as HardhatRuntimeEnvironment,
      mockConsoleLog,
    );

    assertOutputIncludes(mockConsoleLog, fakeKeystoreFilePath);
  });
});
