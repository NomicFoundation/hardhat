import { assert } from "chai";
import path from "path";
import sinon from "sinon";

import fs from "fs";
import { TASK_CLEAN } from "../../../../src/builtin-tasks/task-names";
import { HardhatContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { DEFAULT_SOLC_VERSION } from "../../../../src/internal/core/config/default-config";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { resetHardhatContext } from "../../../../src/internal/reset";
import { useEnvironment } from "../../../helpers/environment";
import {
  expectHardhatError,
  expectHardhatErrorAsync,
} from "../../../helpers/errors";
import {
  getFixtureProjectPath,
  useFixtureProject,
} from "../../../helpers/project";
import {
  getAllFilesMatching,
  getRealPathSync,
} from "../../../../src/internal/util/fs-utils";

describe("config loading", function () {
  describe("default config path", function () {
    useFixtureProject("config-project");
    useEnvironment();

    it("should load the default config if none is given", function () {
      assert.isDefined(this.env.config.networks.localhost);
      assert.deepEqual(this.env.config.networks.localhost.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
      ]);
    });
  });

  describe("can load CJS config path inside an esm project", function () {
    useFixtureProject("esm/cjs-config");
    useEnvironment();

    it("should load the default config if none is given", function () {
      assert.isDefined(this.env.config.networks.localhost);
      assert.deepEqual(this.env.config.networks.localhost.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
      ]);
    });
  });

  describe("Config validation", function () {
    describe("When the config is invalid", function () {
      useFixtureProject("invalid-config");

      beforeEach(function () {
        HardhatContext.createHardhatContext();
      });

      afterEach(function () {
        resetHardhatContext();
      });

      it("Should throw the right error", function () {
        expectHardhatError(
          () => loadConfigAndTasks(),
          ERRORS.GENERAL.INVALID_CONFIG
        );
      });
    });
  });

  describe("custom config path", function () {
    useFixtureProject("custom-config-file");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should accept a relative path from the CWD", function () {
      const { resolvedConfig } = loadConfigAndTasks({ config: "config.js" });

      assert.equal(
        resolvedConfig.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });

    it("should accept an absolute path", async function () {
      const fixtureDir = await getFixtureProjectPath("custom-config-file");
      const { resolvedConfig } = loadConfigAndTasks({
        config: path.join(fixtureDir, "config.js"),
      });

      assert.equal(
        resolvedConfig.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });
  });

  describe("Tasks loading", function () {
    useFixtureProject("config-project");
    useEnvironment();

    it("Should define the default tasks", function () {
      assert.containsAllKeys(this.env.tasks, [
        TASK_CLEAN,
        "flatten",
        "compile",
        "help",
        "run",
        "test",
      ]);
    });

    it("Should load custom tasks", function () {
      assert.containsAllKeys(this.env.tasks, ["example", "example2"]);
    });
  });

  describe("Config env", function () {
    useFixtureProject("config-project");

    afterEach(function () {
      resetHardhatContext();
    });

    it("should remove everything from global state after loading", function () {
      const globalAsAny: any = global;

      HardhatContext.createHardhatContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.subtask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);

      resetHardhatContext();

      HardhatContext.createHardhatContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.subtask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
      resetHardhatContext();
    });
  });

  describe("Config that imports the library", function () {
    useFixtureProject("config-imports-lib-project");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should accept a relative path from the CWD", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.GENERAL.LIB_IMPORTED_FROM_THE_CONFIG
      );
    });
  });

  describe("missing package", function () {
    useFixtureProject("import-missing-package");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e: any) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("dependency not installed", function () {
    useFixtureProject("import-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e: any) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("devDependency not installed", function () {
    useFixtureProject("import-dev-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e: any) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("plugin peer dependency not installed", function () {
    useFixtureProject("plugin-peer-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the plugin and the missing dependency", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency"
      );
    });
  });

  describe("plugin multiple peer dependencies not installed", function () {
    useFixtureProject("plugin-multiple-peer-dependencies-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the plugin and the missing dependencies", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency, some-other-dependency"
      );
    });
  });

  describe("buidler plugin", function () {
    useFixtureProject("buidler-plugin");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the buidler plugin", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.BUIDLER_PLUGIN,
        `You are using some-buidler-plugin, which is a Buidler plugin. Use the equivalent
Hardhat plugin instead.`
      );
    });
  });

  describe("dynamic import of missing dependency in task", function () {
    useFixtureProject("plugin-dynamic-import-not-installed");
    useEnvironment();

    it("should indicate the plugin and the missing dependencies", async function () {
      await expectHardhatErrorAsync(
        () => this.env.run("some-task"),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency"
      );
    });
  });

  describe("Required files recording", function () {
    useFixtureProject("files-required-by-config-tracking-example");

    afterEach(function () {
      resetHardhatContext();
    });

    it("Should keep track of all the files imported when loading the config", async function () {
      const builtinTasksFiles = await getAllFilesMatching(
        // We use realpathSync and not getRealPathSync as that's what node uses
        // internally.
        fs.realpathSync(
          path.join(__dirname, "..", "..", "..", "..", "src", "builtin-tasks")
        ),
        (f) => f.endsWith(".ts")
      );

      const projectPath = getRealPathSync(".");

      // We run this twice to make sure that the cache is cleaned properly
      for (let i = 0; i < 2; i++) {
        HardhatContext.createHardhatContext();
        loadConfigAndTasks();
        const ctx = HardhatContext.getHardhatContext();

        const files = ctx.getFilesLoadedDuringConfig();

        const filesJson = JSON.stringify(files, undefined, 2);

        for (const file of builtinTasksFiles) {
          // The task names and the utils may have been loaded before, so we ignore them.
          if (
            file.endsWith("task-names.ts") ||
            file.includes(path.join(path.sep, "utils", path.sep))
          ) {
            continue;
          }

          assert.include(
            files,
            file,
            `${file} should be included in ${filesJson}`
          );
        }

        // Must include the config file and the files directly and
        // indirectly imported by it.
        assert.include(files, path.join(projectPath, "hardhat.config.js"));
        assert.include(files, path.join(projectPath, "a.js"));
        assert.include(files, path.join(projectPath, "b.js"));

        // Must not include unrelated files.
        assert.notInclude(files, path.join(projectPath, "not-imported.js"));

        resetHardhatContext();
      }
    });
  });

  describe("solidity config warnings", function () {
    useFixtureProject("solidity-config-warnings");

    let consoleWarnStub: sinon.SinonStub;
    beforeEach(function () {
      consoleWarnStub = sinon.stub(console, "warn");
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      consoleWarnStub.restore();
      resetHardhatContext();
    });

    it("should emit a warning if config is the empty object", function () {
      loadConfigAndTasks(
        {
          config: "empty-config.js",
        },
        { showEmptyConfigWarning: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(
        consoleWarnStub.args[0][0],
        "Hardhat config is returning an empty config object, check the export from the config file if this is unexpected."
      );
      assert.include(
        consoleWarnStub.args[0][0],
        "Learn more about configuring Hardhat at https://v2.hardhat.org/config"
      );
    });

    it("should emit a warning if there's no configured solidity", function () {
      const { resolvedConfig } = loadConfigAndTasks(
        {
          config: "config-without-solidity.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(
        consoleWarnStub.args[0][0],
        "Solidity compiler is not configured"
      );
      assert.equal(resolvedConfig.solidity.compilers.length, 1);
      assert.equal(
        resolvedConfig.solidity.compilers[0].version,
        DEFAULT_SOLC_VERSION
      );
    });

    it.skip("should emit a warning if the solc version is too new", function () {
      loadConfigAndTasks(
        {
          config: "unsupported-new-solc.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(consoleWarnStub.args[0][0], "is not fully supported yet");
    });

    it.skip("should emit a warning if there are multiple unsupported versions", function () {
      loadConfigAndTasks(
        {
          config: "multiple-unsupported-solc.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(consoleWarnStub.args[0][0], "are not fully supported yet");
    });

    it.skip("should emit a warning if there is an unsupported version in an override", function () {
      loadConfigAndTasks(
        {
          config: "unsupported-solc-in-override.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(consoleWarnStub.args[0][0], "is not fully supported yet");
    });

    it("should emit a warning if there is a remapping in the compiler settings", function () {
      loadConfigAndTasks(
        {
          config: "remapping-in-settings.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(
        consoleWarnStub.args[0][0],
        "remappings are not currently supported"
      );
    });

    it("should emit a warning if there is a remapping in the list of compiler settings", function () {
      loadConfigAndTasks(
        {
          config: "remapping-in-list.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(
        consoleWarnStub.args[0][0],
        "remappings are not currently supported"
      );
    });

    it("should emit a warning if there is a remapping in the list of compiler overrides", function () {
      loadConfigAndTasks(
        {
          config: "remapping-in-override.js",
        },
        { showSolidityConfigWarnings: true }
      );

      assert.equal(consoleWarnStub.callCount, 1);
      assert.include(
        consoleWarnStub.args[0][0],
        "remappings are not currently supported"
      );
    });
  });

  describe("ESM project", function () {
    describe(".js config file", function () {
      useFixtureProject("esm/js-config");

      beforeEach(function () {
        HardhatContext.createHardhatContext();
      });

      afterEach(function () {
        resetHardhatContext();
      });

      it("Should throw the right error", function () {
        expectHardhatError(
          () => loadConfigAndTasks(),
          ERRORS.GENERAL.ESM_PROJECT_WITHOUT_CJS_CONFIG
        );
      });
    });

    describe(".cjs config file", function () {
      useFixtureProject("esm/cjs-config");

      beforeEach(function () {
        HardhatContext.createHardhatContext();
      });

      afterEach(function () {
        resetHardhatContext();
      });

      it("Should not throw", function () {
        loadConfigAndTasks();
      });
    });
  });
});
