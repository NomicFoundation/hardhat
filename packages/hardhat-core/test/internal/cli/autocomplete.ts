import { expect } from "chai";
import * as os from "os";

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
  "--config",
  "--emoji",
  "--help",
  "--max-memory",
  "--network",
  "--show-stack-traces",
  "--tsconfig",
  "--verbose",
  "--version",
];

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

      expect(suggestions).same.deep.members(["--verbose", "--version"]);
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

      expect(suggestions).same.deep.members(["hardhat", "localhost"]);
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

      expect(suggestions).same.deep.members(["hardhat", "localhost"]);
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

      expect(suggestions).same.deep.members(["compile"]);
    });

    it("should show suggestions after a partial network value", async () => {
      const suggestions = await complete("hh --network loc");

      expect(suggestions).same.deep.members(["localhost"]);
    });

    it("should not suggest params after a task if the last word doesn't start with --", async () => {
      const suggestions = await complete("hh compile --config config.js ");

      expect(suggestions).to.have.deep.members([
        "hardhat.config.js",
        "package.json",
        "scripts",
      ]);
    });

    it("should complete filenames", async () => {
      const suggestions = await complete("hh run ");

      expect(suggestions).to.have.deep.members([
        "hardhat.config.js",
        "package.json",
        "scripts",
      ]);
    });

    it("should complete filenames after a partial word", async () => {
      const suggestions = await complete("hh compile --config ha");

      expect(suggestions).to.have.deep.members(["hardhat.config.js"]);
    });

    it("should return two suggestions when a single directory matches", async () => {
      const suggestions = await complete("hh run scri");

      expect(suggestions).to.have.deep.members(["scripts", "scripts/"]);
    });

    it("should complete filenames inside a directory", async () => {
      const suggestions = await complete("hh compile --config scripts/");

      expect(suggestions).to.have.deep.members([
        "scripts/foo1.js",
        "scripts/foo2.js",
        "scripts/bar.js",
        "scripts/nested",
      ]);
    });

    it("should complete filenames inside a directory after a partial file", async () => {
      const suggestions = await complete("hh compile --config scripts/fo");

      expect(suggestions).to.have.deep.members([
        "scripts/foo1.js",
        "scripts/foo2.js",
      ]);
    });

    it("should complete hidden filenames inside a directory after a dot", async () => {
      const suggestions = await complete("hh compile --config scripts/.");

      expect(suggestions).to.have.deep.members(["scripts/.hidden.js"]);
    });

    it("should complete hidden filenames inside a directory after a partial word", async () => {
      const suggestions = await complete("hh compile --config scripts/.hi");

      expect(suggestions).to.have.deep.members(["scripts/.hidden.js"]);
    });

    it("should not show files inside a directory if there's no slash at the end", async () => {
      const suggestions = await complete("hh compile --config scripts/nested");

      expect(suggestions).to.have.deep.members([
        "scripts/nested",
        "scripts/nested/",
      ]);
    });

    it("should complete filenames inside a nested directory", async () => {
      const suggestions = await complete("hh compile --config scripts/nested/");

      expect(suggestions).to.have.deep.members(["scripts/nested/nested.js"]);
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

      expect(suggestions).to.have.deep.members(["my-task"]);
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

  describe("overriden task", () => {
    useFixtureProject("autocomplete/overriden-task");

    after(() => {
      resetHardhatContext();
    });

    it("should work when a task is overriden", async () => {
      const suggestions = await complete("hh ");
      expect(suggestions).to.have.deep.members(coreTasks);
    });

    it("should work when called a second time", async () => {
      const suggestions = await complete("hh ");

      expect(suggestions).to.have.deep.members(coreTasks);
    });
  });
});
