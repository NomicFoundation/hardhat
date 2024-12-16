import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  SubprocessFileNotFoundError,
  SubprocessPathIsDirectoryError,
} from "../src/errors/subprocess.js";
import { exists, readJsonFile, remove } from "../src/fs.js";
import { spawnDetachedSubProcess } from "../src/subprocess.js";

const PATH_TO_FIXTURE = path.join(
  process.cwd(),
  "test",
  "fixture-projects",
  "subprocess",
);

const ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE = path.join(
  PATH_TO_FIXTURE,
  "tmp-file.json",
);

async function checkIfSubprocessWasExecuted() {
  // Checks if the subprocess was executed by waiting for a file to be created.
  // Uses an interval to periodically check for the file. If the file isn't found
  // within a specified number of attempts, an error is thrown, indicating a failure in subprocess execution.
  const MAX_COUNTER = 20;

  return new Promise((resolve, reject) => {
    let counter = 0;

    const intervalId = setInterval(async () => {
      counter++;

      if (await exists(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE)) {
        try {
          // Wait for the file to be readable. The file could exist but the writing could be in progress.
          await readJsonFile(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE);
          clearInterval(intervalId);
          resolve(true);
        } catch (_err) {}
      } else if (counter > MAX_COUNTER) {
        clearInterval(intervalId);
        reject("Subprocess was not executed in the expected time");
      }
    }, 100);
  });
}

describe("subprocess", () => {
  beforeEach(async () => {
    await remove(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE);
  });

  afterEach(async () => {
    await remove(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE);
  });

  it("should execute the TypeScript subprocess with the correct arguments", async () => {
    const pathToSubprocessFile = path.join(PATH_TO_FIXTURE, "ts-subprocess.ts");

    await spawnDetachedSubProcess(pathToSubprocessFile, ["ts-one", "ts-2"]);

    await checkIfSubprocessWasExecuted();

    const subprocessInfo = await readJsonFile(
      ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE,
    );

    // Checks if the file created by the subprocess contains the expected data.
    // The subprocess writes its received arguments to a JSON file.
    assert.deepEqual(subprocessInfo, {
      executed: true,
      arg1: "ts-one",
      arg2: "ts-2",
    });
  });

  it("should execute the TypeScript subprocess with the correct env variables passed as params", async () => {
    const pathToSubprocessFile = path.join(
      PATH_TO_FIXTURE,
      "ts-subprocess-env.ts",
    );

    await spawnDetachedSubProcess(pathToSubprocessFile, [], { env1: "env1" });

    await checkIfSubprocessWasExecuted();

    const subprocessInfo: { executed: boolean; envVars: { env1: string } } =
      await readJsonFile(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE);

    // Checks if the file created by the subprocess contains the expected data.
    // The subprocess writes its received arguments to a JSON file.
    assert.equal(subprocessInfo.executed, true);
    assert.equal(subprocessInfo.envVars.env1, "env1");
  });

  it("should print to stdio from the subprocess without errors (bug related to windows)", async () => {
    const pathToSubprocessFile = path.join(
      PATH_TO_FIXTURE,
      "ts-subprocess-stdio.ts",
    );

    await spawnDetachedSubProcess(pathToSubprocessFile);

    await checkIfSubprocessWasExecuted();

    const subprocessInfo: { executed: boolean } = await readJsonFile(
      ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE,
    );

    // Checks if the file created by the subprocess contains the expected data.
    // The subprocess writes its received arguments to a JSON file.
    assert.equal(subprocessInfo.executed, true);
  });

  it("should execute the Javascript subprocess with the correct arguments", async () => {
    const pathToSubprocessFile = path.join(PATH_TO_FIXTURE, "js-subprocess.js");

    await spawnDetachedSubProcess(pathToSubprocessFile, ["js-one", "js-2"]);

    await checkIfSubprocessWasExecuted();

    const subprocessInfo = await readJsonFile(
      ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE,
    );

    // Checks if the file created by the subprocess contains the expected data.
    // The subprocess writes its received arguments to a JSON file.
    assert.deepEqual(subprocessInfo, {
      executed: true,
      arg1: "js-one",
      arg2: "js-2",
    });
  });

  it("should throw an error because the file to execute does not exist", async () => {
    const pathToSubprocessFile = path.join(
      PATH_TO_FIXTURE,
      "non-existing-file.ts",
    );

    await assert.rejects(
      async () =>
        spawnDetachedSubProcess(pathToSubprocessFile, [], { env1: "env1" }),
      new SubprocessFileNotFoundError(pathToSubprocessFile),
    );
  });

  it("should throw an error because the file to execute is not a file but a directory", async () => {
    const pathToSubprocessFile = path.join(PATH_TO_FIXTURE);

    await assert.rejects(
      async () =>
        spawnDetachedSubProcess(pathToSubprocessFile, [], { env1: "env1" }),
      new SubprocessPathIsDirectoryError(pathToSubprocessFile),
    );
  });
});
