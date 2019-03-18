import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { BuidlerContext } from "@nomiclabs/buidler/internal/context";
import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

async function resetBuidlerContext() {
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

async function reset(cwd: string) {
  await resetBuidlerContext();
  unloadModule("../src/index");
  process.chdir(__dirname + cwd);
  const env = require("@nomiclabs/buidler");
  env.config.solpp.cwd = env.config.paths.sources;
  return env;
}

describe("Solpp plugin", async function() {
  describe("js-config-project", async function() {
    beforeEach("setup", async function() {
      this.env = await reset("/js-config-project");
    });

    it("should evaluate symbols as javascript functions", async function() {
      const paths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();
      assert.include(generatedContractA, "1337");
    });

    it("should compile without errors", async function() {
      try {
        await this.env.run("compile");
      } catch (err) {
        assert.isUndefined(err);
      }
    });
  });

  describe("json-config-project", async function() {
    beforeEach("setup", async function() {
      this.env = await reset("/json-config-project");
    });

    it("should load definitions from json", async function() {
      const paths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);
      const generatedContractA = readFileSync(paths[0]).toString();

      assert.include(generatedContractA, "48192.418291248");
    });
  });

  describe("buidler-project", async function() {
    beforeEach("setup", async function() {
      this.env = await reset("/buidler-project");
    });

    it("should create processed contracts in cache directory", async function() {
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

    describe("fail-project", async function() {
      beforeEach("setup", async function() {
        this.env = await reset("/fail-project");
      });

      it("should fail when symbol does not exist", async function() {
        const contractPath = join(this.env.config.paths.sources, "A.sol");
        const content = readFileSync(contractPath).toString();
        const files = [[contractPath, content]];
        const opts = {};

        let paths;
        try {
          paths = await this.env.run("buidler-solpp:run-solpp", {
            files,
            opts
          });
        } catch (err) {
          console.log(err);
        }

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
    });
  });
});
