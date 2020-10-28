import { expect } from "chai";

import { complete as completeFn } from "../../../src/internal/cli/autocomplete";
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
): Promise<Array<{ name: string; description?: string }>> {
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
    description: "Shows hardhat's version.",
    name: "--version",
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
    description: "Reserved hardhat argument -- Has no effect.",
    name: "--tsconfig",
  },
  {
    name: "--verbose",
    description: "Enables Hardhat verbose logging",
  },
];

const forceParam = {
  name: "--force",
  description: "Force compilation ignoring cache",
};

const quietParam = {
  name: "--quiet",
  description: "Makes the compilation process less verbose",
};

describe.only("autocomplete", () => {
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
        { name: "hardhat" },
        { name: "localhost" },
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
        { name: "hardhat" },
        { name: "localhost" },
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
          name: "--no-compile",
          description: "Don't compile before running this task",
        },
      ]);
    });

    it("should work when the cursor is at the middle and in a partial word", async () => {
      const suggestions = await complete("hh com| --verbose");

      expect(suggestions).same.deep.members(coreTasks);
    });

    it("should show suggestions after a partial network value", async () => {
      const suggestions = await complete("hh --network loc");

      expect(suggestions).same.deep.members([
        { name: "hardhat" },
        { name: "localhost" },
      ]);
    });

    it("should return all completions if last word is not commplete", async () => {
      const suggestions = await complete("hh compile");

      expect(suggestions).to.have.deep.members(coreTasks);
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
          description: "This is a custom task",
        },
      ]);
    });

    it("should complete tasks after a - in the middle of the task name", async () => {
      const suggestions = await complete("hh my-");

      expect(suggestions).to.have.deep.members([
        ...coreTasks,
        {
          name: "my-task",
          description: "This is a custom task",
        },
      ]);
    });

    it("should include custom params", async () => {
      const suggestions = await complete("hh my-task --");

      expect(suggestions).to.have.deep.members([
        ...coreParams,
        { name: "--my-flag", description: "Flag description" },
        { name: "--param", description: "Param description" },
      ]);
    });
  });
});
