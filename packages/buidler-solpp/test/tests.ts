import {
  TASK_COMPILE_COMPILE,
  TASK_COMPILE_GET_COMPILER_INPUT,
  TASK_COMPILE_GET_SOURCE_PATHS
} from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerContext } from "@nomiclabs/buidler/internal/context";
import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

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

async function unloadBuidlerContext() {
  if (BuidlerContext.isCreated()) {
    const ctx = BuidlerContext.getBuidlerContext();
    const globalAsAny = global as any;
    if (ctx.environment !== undefined) {
      for (const key of Object.keys(ctx.environment)) {
        globalAsAny[key] = undefined;
      }
      // unload config file too.
      unloadModule(ctx.environment.config.paths.configFile);
    }
    BuidlerContext.deleteBuidlerContext();
  }

  // Unload all the buidler's entrypoints.
  unloadModule("@nomiclabs/buidler");
  unloadModule("@nomiclabs/buidler/config");
  unloadModule("@nomiclabs/buidler/register");
  unloadModule("@nomiclabs/buidler/internal/cli/cli");
  unloadModule("@nomiclabs/buidler/internal/lib/buidler-lib");
  unloadModule("@nomiclabs/buidler/internal/core/config/config-env");
  unloadModule("@nomiclabs/buidler/internal/core/tasks/builtin-tasks");

  // Unload bultin tasks.
  Object.keys(require.cache).forEach(module => {
    if (module.includes("buidler/builtin-tasks")) {
      unloadModule(module);
    }
  });
}

function unloadModule(path: string) {
  try {
    delete require.cache[require.resolve(path)];
  } catch (err) {
    // module wasn't loaded
  }
}

async function reset() {
  await unloadBuidlerContext();
  unloadModule("../src/index");
  return require("@nomiclabs/buidler");
}

describe("Solpp plugin", async function() {
  describe("js-config-project", async function() {
    before("setup", async function() {
      process.chdir(__dirname + "/js-config-project");
    });

    beforeEach("reset buidler context", async function() {
      this.env = await reset();
    });

    it("should evaluate symbols as javascript functions", async function() {
      const paths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();
      assert.include(generatedContractA, "1337");
    });

    it("should compile without errors", async function() {
      const input = this.env.run(TASK_COMPILE_GET_COMPILER_INPUT);
      assert.doesNotThrow(() => this.env.run(TASK_COMPILE_COMPILE, { input }));
    });
  });

  describe("json-config-project", async function() {
    before("setup", async function() {
      process.chdir(__dirname + "/json-config-project");
    });

    beforeEach("reset buidler context", async function() {
      this.env = await reset();
    });

    it("should load definitions from json", async function() {
      const paths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();

      assert.include(generatedContractA, "48192.418291248");
    });

    it("should load the config properly", async function() {
      assert.equal(this.env.config.solpp.collapseEmptyLines, false);
      assert.equal(this.env.config.solpp.noFlatten, true);
      assert.equal(this.env.config.solpp.tolerant, true);
    });
  });

  describe("buidler-project", async function() {
    before("setup", async function() {
      process.chdir(__dirname + "/buidler-project");
    });

    beforeEach("reset buidler context", async function() {
      this.env = await reset();
    });

    it("should create processed contracts in the cache directory", async function() {
      const paths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);

      paths.forEach((path: string) => {
        assert.include(path, "solpp-generated-contracts");
      });
    });

    it("should collapse empty lines", async function() {
      const contractPath = join(this.env.config.paths.sources, "B.sol");
      const content = readFileSync(contractPath).toString();
      const files = [[contractPath, content]];
      const opts = {
        collapseEmptyLines: true,
        noPreprocessor: false
      };
      const paths = await this.env.run("buidler-solpp:run-solpp", {
        files,
        opts
      });

      assert.equal(paths.length, 1);

      const generatedContent = readFileSync(paths[0]).toString();

      const countEmptyLines = (text: string) => {
        return text ? (text.match(/^[ \t]*$/gm) || []).length : 0;
      };

      assert.isBelow(
        countEmptyLines(generatedContent),
        countEmptyLines(content)
      );
    });

    // This test skipped because solpp won't fail if a contract has an non-defined symbol.
    describe.skip("fail-project", async function() {
      before("setup", async function() {
        process.chdir(__dirname + "/fail-project");
      });

      beforeEach("reset buidler context", async function() {
        this.env = await reset();
      });

      it("should fail when symbol does not exist", async function() {
        const contractPath = join(this.env.config.paths.sources, "A.sol");
        const content = readFileSync(contractPath).toString();
        const files = [[contractPath, content]];
        const opts = {};

        await expectErrorAsync(async () =>
          this.env.run("buidler-solpp:run-solpp", {
            files,
            opts
          })
        );
      });
    });
  });
});
