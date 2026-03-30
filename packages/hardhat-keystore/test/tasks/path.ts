import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { Mock } from "node:test";

import { describe, it, mock } from "node:test";

import { path } from "../../src/internal/tasks/path.js";
import { assertOutputIncludes } from "../helpers/assert-output-includes.js";

const fakeKeystoreFilePath = "./fake-keystore-path.json";
const fakeDevKeystoreFilePath = "./fake-dev-keystore-path.json";

const mockConsoleLog: Mock<(text: string) => void> = mock.fn();

describe("tasks - path", () => {
  const expectedResults = [fakeKeystoreFilePath, fakeDevKeystoreFilePath];

  for (const [i, dev] of [false, true].entries()) {
    describe(`${dev ? "development" : "production"} keystore`, () => {
      it("should print the keystore file path", async () => {
        await path(
          {
            dev,
          },
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Simulate the config for the keystore plugin
          {
            config: {
              keystore: {
                filePath: fakeKeystoreFilePath,
                devFilePath: fakeDevKeystoreFilePath,
              },
            },
          } as HardhatRuntimeEnvironment,
          mockConsoleLog,
        );

        assertOutputIncludes(mockConsoleLog, expectedResults[i]);
      });
    });
  }
});
