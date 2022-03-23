import { expect } from "chai";
import * as os from "os";

import {
  complete as completeFn,
  HARDHAT_COMPLETE_FILES,
} from "../../../src/internal/cli/autocomplete";
import { resetHardhatContext } from "../../../src/internal/reset";
import { useFixtureProject } from "../../helpers/project";

/**
 * Receive the line that is being completed, for example:
 * - `hh ` is the minimal line that can be completed (notice the space!)
 * - `hh comp` means that the cursor is immediately after the word
 * - `hh --network | compile` you can optionally use `|` to indicate the cursor's position; otherwise it is assumed the cursor is at the end
 */
async function complete(
  lineWithCursor: string
): Promise<
  Array<{ name: string; description?: string }> | typeof HARDHAT_COMPLETE_FILES
> {
  const point = lineWithCursor.indexOf("|");
  const line = lineWithCursor.replace("|", "");

  return completeFn({
    line,
    point: point !== -1 ? point : line.length,
  });
}

const coreTasks = [
  {
    description: "Check whatever you need",
    name: "check",
  },
  {
    description: "Clears the cache and deletes all artifacts",
    name: "clean",
  },
  {
    description: "Compiles the entire project, building all artifacts",
    name: "compile",
  },
  {
    description: "Opens a hardhat console",
    name: "console",
  },
  {
    description: "Flattens and prints contracts and their dependencies",
    name: "flatten",
  },
  {
    description: "Prints this message",
    name: "help",
  },
  {
    description: "Starts a JSON-RPC server on top of Hardhat Network",
    name: "node",
  },
  {
    description: "Runs a user-defined script after compiling the project",
    name: "run",
  },
  {
    description: "Runs mocha tests",
    name: "test",
  },
];

const verboseParam = {
  description: "Enables Hardhat verbose logging",
  name: "--verbose",
};

const versionParam = {
  description: "Shows hardhat's version.",
  name: "--version",
};

const coreParams = [
  {
    description: "The network to connect to.",
    name: "--network",
  },
  {
    description: "Show stack traces.",
    name: "--show-stack-traces",
  },
  {
    description: "Shows this message, or a task's help if its name is provided",
    name: "--help",
  },
  {
    description: "Use emoji in messages.",
    name: "--emoji",
  },
  {
    description: "A Hardhat config file.",
    name: "--config",
  },
  {
    description: "The maximum amount of memory that Hardhat can use.",
    name: "--max-memory",
  },
  {
    description: "A TypeScript config file.",
    name: "--tsconfig",
  },
  verboseParam,
  versionParam,
];

const forceParam = {
  description: "Force compilation ignoring cache",
  name: "--force",
};
const quietParam = {
  description: "Makes the compilation process less verbose",
  name: "--quiet",
};

describe("autocomplete", function () {
  if (os.type() === "Windows_NT") {
    return;
  }

  describe("basic project", () => {
    useFixtureProject("autocomplete/basic-project");

    after(() => {
      resetHardhatContext();
    });

    it("should suggest all task names", async () => {
      const suggestions = await complete("hh ");

      expect(suggestions).to.have.deep.members(coreTasks);
    });

    it("should suggest all core params after a -", async () => {
      const suggestions = await complete("hh -");

      expect(suggestions).to.have.deep.members(coreParams);
    });

    it("should suggest all core params after a --", async () => {
      const suggestions = await complete("hh --");

      expect(suggestions).same.deep.members(coreParams);
    });

    it("should suggest ony matching flags", async () => {
      const suggestions = await complete("hh --ve");

      expect(suggestions).same.deep.members([
        {
          name: "--verbose",
          description: "Enables Hardhat verbose logging",
        },
        {
          name: "--version",
          description: "Shows hardhat's version.",
        },
      ]);
    });

    it("shouldn't suggest an already used flag", async () => {
      const suggestions = await complete("hh --verbose -");

      const coreParamsWithoutVerbose = coreParams.filter(
        (x) => x.name !== "--verbose"
      );

      expect(suggestions).same.deep.members(coreParamsWithoutVerbose);
    });

    it("should suggest task flags", async () => {
      const suggestions = await complete("hh compile -");

      expect(suggestions).same.deep.members([
        ...coreParams,
        forceParam,
        quietParam,
      ]);
    });

    it("should ignore already used flags", async () => {
      const suggestions = await complete("hh --verbose compile --quiet --");

      const coreParamsWithoutVerbose = coreParams.filter(
        (x) => x.name !== "--verbose"
      );

      expect(suggestions).same.deep.members([
        ...coreParamsWithoutVerbose,
        forceParam,
      ]);
    });

    it("should suggest a network", async () => {
      const suggestions = await complete("hh --network ");

      expect(suggestions).same.deep.members([
        { name: "hardhat", description: "" },
        { name: "localhost", description: "" },
      ]);
    });

    it("should suggest task names after global param", async () => {
      const suggestions = await complete("hh --network localhost ");

      expect(suggestions).same.deep.members(coreTasks);
    });

    it("should suggest params after some param", async () => {
      const suggestions = await complete("hh --network localhost -");

      const coreParamsWithoutNetwork = coreParams.filter(
        (x) => x.name !== "--network"
      );

      expect(suggestions).same.deep.members(coreParamsWithoutNetwork);
    });

    it("should work when the cursor is not at the end", async () => {
      const suggestions = await complete("hh --network | test");

      expect(suggestions).same.deep.members([
        { name: "hardhat", description: "" },
        { name: "localhost", description: "" },
      ]);
    });

    it("should not suggest flags used after the cursor", async () => {
      const suggestions = await complete("hh --| test --verbose");

      const coreParamsWithoutVerbose = coreParams.filter(
        (x) => x.name !== "--verbose"
      );

      expect(suggestions).same.deep.members([
        ...coreParamsWithoutVerbose,
        {
          description: "Don't compile before running this task",
          name: "--no-compile",
        },
        {
          description: "Run tests in parallel",
          name: "--parallel",
        },
        {
          description: "Stop running tests after the first test failure",
          name: "--bail",
        },
        {
          description: "Only run tests matching the given string or regexp",
          name: "--grep",
        },
      ]);
    });

    it("should work when the cursor is at the middle and in a partial word", async () => {
      const suggestions = await complete("hh com| --verbose");

      expect(suggestions).same.deep.members([
        {
          name: "compile",
          description: "Compiles the entire project, building all artifacts",
        },
      ]);
    });

    it("should show suggestions after a partial network value", async () => {
      const suggestions = await complete("hh --network loc");

      expect(suggestions).same.deep.members([
        { name: "localhost", description: "" },
      ]);
    });

    it("should not suggest params after a task if the last word doesn't start with --", async () => {
      const suggestions = await complete("hh compile --config config.js ");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames", async () => {
      const suggestions = await complete("hh run ");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames after a partial word", async () => {
      const suggestions = await complete("hh compile --config ha");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames after a partial word that starts with --", async () => {
      const suggestions = await complete("hh compile --config --");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames inside a directory", async () => {
      const suggestions = await complete("hh compile --config scripts/");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames inside a directory after a partial file", async () => {
      const suggestions = await complete("hh compile --config scripts/fo");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete hidden filenames inside a directory after a dot", async () => {
      const suggestions = await complete("hh compile --config scripts/.");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete hidden filenames inside a directory after a partial word", async () => {
      const suggestions = await complete("hh compile --config scripts/.hi");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });

    it("should complete filenames inside a nested directory", async () => {
      const suggestions = await complete("hh compile --config scripts/nested/");

      expect(suggestions).to.equal(HARDHAT_COMPLETE_FILES);
    });
  });

  describe("custom tasks", () => {
    useFixtureProject("autocomplete/custom-tasks");

    after(() => {
      resetHardhatContext();
    });

    it("should include custom tasks", async () => {
      const suggestions = await complete("hh ");

      expect(suggestions).to.have.deep.members([
        ...coreTasks,
        {
          name: "my-task",
          description: "",
        },
        {
          name: "task-with-description",
          description: "This is the task description",
        },
      ]);
    });

    it("should complete tasks after a - in the middle of the task name", async () => {
      const suggestions = await complete("hh my-");

      expect(suggestions).to.have.deep.members([
        {
          name: "my-task",
          description: "",
        },
      ]);
    });

    it("should include custom params", async () => {
      const suggestions = await complete("hh my-task --");

      expect(suggestions).to.have.deep.members([
        ...coreParams,
        { name: "--my-flag", description: "" },
        { name: "--param", description: "" },
        {
          name: "--my-flag-with-description",
          description: "Flag description",
        },
        {
          name: "--param-with-description",
          description: "Param description",
        },
      ]);
    });
  });

  describe("overridden task", () => {
    useFixtureProject("autocomplete/overridden-task");

    after(() => {
      resetHardhatContext();
    });

    it("should work when a task is overridden", async () => {
      const suggestions = await complete("hh ");
      expect(suggestions).to.have.deep.members(coreTasks);
    });

    it("should work when called a second time", async () => {
      const suggestions = await complete("hh ");

      expect(suggestions).to.have.deep.members(coreTasks);
    });
  });
});
