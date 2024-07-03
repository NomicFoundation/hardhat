// import assert from "node:assert/strict";
import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import { exists, readJsonFile, remove } from "../src/fs.js";
import { spawnDetachedSubProcess } from "../src/subprocess.js";

import { ABSOLUTE_PATH_TO_TMP_SUBPROCESS_FILE } from "./fixture-projects/subprocess/subprocess.js";

async function checkIfSubprocessWasExecuted() {
  // Checks if the subprocess was executed by waiting for a file to be created.
  // Uses an interval to periodically check for the file. If the file isn't found
  // within a specified number of attempts, an error is thrown, indicating a failure in subprocess execution.
  const MAX_COUNTER = 20;

  return new Promise((resolve, reject) => {
    let counter = 0;

    const intervalId = setInterval(async () => {
      counter++;

      if (await exists(ABSOLUTE_PATH_TO_TMP_SUBPROCESS_FILE)) {
        clearInterval(intervalId);
        resolve(true);
      } else if (counter > MAX_COUNTER) {
        clearInterval(intervalId);
        reject("Subprocess was not executed in the expected time");
      }
    }, 100);
  });
}

describe("subprocess", () => {
  beforeEach(async () => {
    await remove(ABSOLUTE_PATH_TO_TMP_SUBPROCESS_FILE);
  });

  it("should execute the subprocess with the correct arguments", async () => {
    const pathToSubprocessFile = path.join(
      process.cwd(),
      "test",
      "fixture-projects",
      "subprocess",
      "subprocess.ts",
    );

    spawnDetachedSubProcess(pathToSubprocessFile, ["one", "2"]);

    await checkIfSubprocessWasExecuted();

    const subprocessInfo = await readJsonFile(
      ABSOLUTE_PATH_TO_TMP_SUBPROCESS_FILE,
    );

    // Checks if the file created by the subprocess contains the expected data.
    // The subprocess writes its received arguments to a JSON file.
    assert.deepEqual(subprocessInfo, {
      executed: true,
      arg1: "one",
      arg2: "2",
    });
  });
});
