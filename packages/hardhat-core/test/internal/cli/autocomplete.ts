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
async function complete(lineWithCursor: string): Promise<string[]> {
  const point = lineWithCursor.indexOf("|");
  const line = lineWithCursor.replace("|", "");

  return completeFn({
    line,
    point: point !== -1 ? point : line.length,
  });
}

const coreTasks = [
  "check",
  "clean",
  "compile",
  "console",
  "flatten",
  "help",
  "node",
  "run",
  "test",
];

const coreParams = [
  "--network",
  "--show-stack-traces",
  "--version",
  "--help",
  "--emoji",
  "--config",
  "--max-memory",
  "--tsconfig",
  "--verbose",
];

describe("autocomplete", () => {
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
        (x) => x !== "--verbose"
      );

      expect(suggestions).same.deep.members(coreParamsWithoutVerbose);
    });

    it("should suggest task flags", async () => {
      const suggestions = await complete("hh compile -");

      expect(suggestions).same.deep.members([
        ...coreParams,
        "--force",
        "--quiet",
      ]);
    });

    it("should ignore already used flags", async () => {
      const suggestions = await complete("hh --verbose compile --quiet --");

      const coreParamsWithoutVerbose = coreParams.filter(
        (x) => x !== "--verbose"
      );

      expect(suggestions).same.deep.members([
        ...coreParamsWithoutVerbose,
        "--force",
      ]);
    });

    it("should suggest a network", async () => {
      const suggestions = await complete("hh --network ");

      expect(suggestions).same.deep.members([
        "hardhat",
        "localhost",
      ]);
    });

    it("should suggest task names after global param", async () => {
      const suggestions = await complete("hh --network localhost ");

      expect(suggestions).same.deep.members(coreTasks);
    });

    it("should suggest params after some param", async () => {
      const suggestions = await complete("hh --network localhost -");

      const coreParamsWithoutNetwork = coreParams.filter(
        (x) => x !== "--network"
      );

      expect(suggestions).same.deep.members(coreParamsWithoutNetwork);
    });

    it("should work when the cursor is not at the end", async () => {
      const suggestions = await complete("hh --network | test");

      expect(suggestions).same.deep.members([
        "hardhat",
        "localhost",
      ]);
    });

    it("should not suggest flags used after the cursor", async () => {
      const suggestions = await complete("hh --| test --verbose");

      const coreParamsWithoutVerbose = coreParams.filter(
        (x) => x !== "--verbose"
      );

      expect(suggestions).same.deep.members([
        ...coreParamsWithoutVerbose,
        "--no-compile",
      ]);
    });

    it("should work when the cursor is at the middle and in a partial word", async () => {
      const suggestions = await complete("hh com| --verbose");

      expect(suggestions).same.deep.members(coreTasks);
    });

    it("should show suggestions after a partial network value", async () => {
      const suggestions = await complete("hh --network loc");

      expect(suggestions).same.deep.members([
        "hardhat",
        "localhost",
      ]);
    });

    it("should return all completions if last word is not commplete", async () => {
      const suggestions = await complete("hh compile");

      expect(suggestions).to.have.deep.members(coreTasks);
    });

    it("should not suggest params after a task if the last word doesn't start with --", async () => {
      const suggestions = await complete("hh compile --config config.js ");

      expect(suggestions).to.have.deep.members([]);
    });
  });

  describe("custom tasks", () => {
    useFixtureProject("autocomplete/custom-tasks");

    after(() => {
      resetHardhatContext();
    });

    it("should include custom tasks", async () => {
      const suggestions = await complete("hh ");

      expect(suggestions).to.have.deep.members([...coreTasks, "my-task"]);
    });

    it("should complete tasks after a - in the middle of the task name", async () => {
      const suggestions = await complete("hh my-");

      expect(suggestions).to.have.deep.members([...coreTasks, "my-task"]);
    });

    it("should include custom params", async () => {
      const suggestions = await complete("hh my-task --");

      expect(suggestions).to.have.deep.members([
        ...coreParams,
        "--my-flag",
        "--param",
      ]);
    });
  });
});
