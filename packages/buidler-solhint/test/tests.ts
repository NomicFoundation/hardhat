import { BuidlerContext } from "@nomiclabs/buidler/internal/context";
import { assert } from "chai";
import { unlink, writeFile, writeJson } from "fs-extra";

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

describe("Solhint plugin", function() {
  const SOLHINT_CONFIG_FILENAME = ".solhint.json";

  describe("Project with solhint config", function() {
    before("setup", async function() {
      process.chdir(__dirname + "/buidler-project");
      process.env.BUIDLER_NETWORK = "develop";
    });

    beforeEach(async function() {
      this.env = await reset();
    });

    it("should define solhint task", function() {
      assert.isDefined(this.env.tasks["buidler-solhint:run-solhint"]);
      assert.isDefined(this.env.tasks.check);
    });

    it("return a report", async function() {
      const reports = await this.env.run("buidler-solhint:run-solhint");
      assert.equal(reports.length, 1);
      assert.equal(reports[0].reports.length, 5);
    });
  });

  describe("Project with no solhint config", function() {
    before("setup", function() {
      process.chdir(__dirname + "/no-config-project");
      process.env.BUIDLER_NETWORK = "develop";
    });

    beforeEach(async function() {
      this.env = await reset();
    });

    it("return a report", async function() {
      const reports = await this.env.run("buidler-solhint:run-solhint");
      assert.equal(reports.length, 1);
      assert.equal(reports[0].reports[0].ruleId, "max-line-length");
    });
  });

  describe("Project with invalid solhint configs", function() {
    before("setup", function() {
      process.chdir(__dirname + "/invalid-config-project");
      process.env.BUIDLER_NETWORK = "develop";
    });

    beforeEach(async function() {
      this.env = await reset();
    });
    it("should throw when using invalid extensions", async function() {
      const invalidExtensionConfig = {
        extends: "invalid"
      };
      await writeJson(SOLHINT_CONFIG_FILENAME, invalidExtensionConfig);

      await expectErrorAsync(
        () => this.env.run("buidler-solhint:run-solhint"),
        "An error occurred when processing your solhint config."
      );
    });

    it("should throw when using invalid rules", async function() {
      const invalidRuleConfig = {
        rules: {
          "invalid-rule": false
        }
      };
      await writeJson(SOLHINT_CONFIG_FILENAME, invalidRuleConfig);

      await expectErrorAsync(
        () => this.env.run("buidler-solhint:run-solhint"),
        "An error occurred when processing your solhint config."
      );
    });

    it("should throw when using a non parsable config", async function() {
      const invalidConfig = "asd";
      await writeFile(SOLHINT_CONFIG_FILENAME, invalidConfig);
      await expectErrorAsync(
        () => this.env.run("buidler-solhint:run-solhint"),
        "An error occurred when loading your solhint config."
      );
    });

    after(async () => {
      await unlink(SOLHINT_CONFIG_FILENAME);
    });
  });
});
