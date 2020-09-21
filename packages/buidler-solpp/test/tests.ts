import {
  TASK_COMPILE_SOLIDITY_COMPILE,
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

import { useEnvironment } from "./helpers";

export async function expectErrorAsync(
  f: () => Promise<any>,
  errorMessage?: string
) {
  try {
    await f();
  } catch (err) {
    assert.equal(err.message, errorMessage);
  }
}

// TODO-HH: Re-enable after having internal tasks for the compilation
describe.skip("Solpp plugin", async function () {
  describe("js-config-project", async function () {
    useEnvironment(join(__dirname, "js-config-project"));

    it("should evaluate symbols as javascript functions", async function () {
      const paths = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();
      assert.include(generatedContractA, "1337");
    });

    it("should compile without errors", async function () {
      const input = this.env.run(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT);
      assert.doesNotThrow(() =>
        this.env.run(TASK_COMPILE_SOLIDITY_COMPILE, { input })
      );
    });
  });

  describe("json-config-project", async function () {
    useEnvironment(join(__dirname, "json-config-project"));

    it("should load definitions from json", async function () {
      const paths = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();

      assert.include(generatedContractA, "48192.418291248");
    });

    it("should load the config properly", async function () {
      assert.isDefined(this.env.config.solpp);
      assert.equal(this.env.config.solpp!.collapseEmptyLines, false);
      assert.equal(this.env.config.solpp!.noFlatten, true);
      assert.equal(this.env.config.solpp!.tolerant, true);
    });
  });

  describe("buidler-project", async function () {
    useEnvironment(join(__dirname, "buidler-project"));

    it("should create processed contracts in the cache directory", async function () {
      const paths = await this.env.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);

      paths.forEach((path: string) => {
        assert.include(path, "solpp-generated-contracts");
      });
    });

    it("should collapse empty lines", async function () {
      const contractPath = join(this.env.config.paths.sources, "B.sol");
      const content = readFileSync(contractPath).toString();
      const files = [[contractPath, content]];
      const opts = {
        collapseEmptyLines: true,
        noPreprocessor: false,
      };
      const paths = await this.env.run("buidler-solpp:run-solpp", {
        files,
        opts,
      });

      assert.equal(paths.length, 1);

      const generatedContent = readFileSync(paths[0]).toString();

      function countEmptyLines(text: string) {
        if (text === "") {
          return 0;
        }

        const match = text.match(/^[ \t]*$/gm);
        if (match === null) {
          return 0;
        }

        return match.length;
      }

      assert.isBelow(
        countEmptyLines(generatedContent),
        countEmptyLines(content)
      );
    });

    // This test skipped because solpp won't fail if a contract has an non-defined symbol.
    describe.skip("fail-project", async function () {
      useEnvironment(join(__dirname, "fail-project"));

      it("should fail when symbol does not exist", async function () {
        const contractPath = join(this.env.config.paths.sources, "A.sol");
        const content = readFileSync(contractPath).toString();
        const files = [[contractPath, content]];
        const opts = {};

        await expectErrorAsync(async () =>
          this.env.run("buidler-solpp:run-solpp", {
            files,
            opts,
          })
        );
      });
    });
  });
});
