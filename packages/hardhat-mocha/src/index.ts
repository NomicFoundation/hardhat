import { TASK_TEST_RUN_MOCHA_TESTS } from "hardhat/builtin-tasks/task-names";
import { subtask } from "hardhat/config";

// This is a copy-paste of the built-in task.
// The reason this works is because `import("mocha")` gets resolved from the
// plugin, which in turn finds the user's version of Mocha.
subtask(TASK_TEST_RUN_MOCHA_TESTS).setAction(
  async ({ testFiles }: { testFiles: string[] }, { config }) => {
    const { default: Mocha } = await import("mocha");
    const mocha = new Mocha(config.mocha);
    testFiles.forEach((file) => mocha.addFile(file));

    const testFailures = await new Promise<number>((resolve, _) => {
      mocha.run(resolve);
    });

    return testFailures;
  }
);
