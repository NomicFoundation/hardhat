import { assert } from "chai";
import path from "path";

import { BuidlerContext } from "../../../src/internal/context";
import { ERRORS } from "../../../src/internal/core/errors";
import {
  loadPluginFile,
  readPackageJson,
  usePlugin
} from "../../../src/internal/core/plugins";
import { expectBuidlerError } from "../../helpers/errors";

describe("plugin system", function() {
  const FIXTURE_PROJECT_PATH = path.join(
    __dirname,
    "..",
    "..",
    "fixture-projects",
    "plugin-loading-project"
  );

  describe("readPackageJson", function() {
    function assertPackageLoaded(packageName: string, version: string) {
      const packageJson = readPackageJson(packageName, FIXTURE_PROJECT_PATH);
      assert.isDefined(packageJson);
      assert.equal(packageJson!.version, version);
    }

    it("Should find packages from a given project", function() {
      assertPackageLoaded("pack1", "2.1.0");
      assertPackageLoaded("requires-other-version-pack1", "1.0.0");
      assertPackageLoaded("requires-missing-pack", "1.0.0");
      assertPackageLoaded("requires-pack1", "1.2.3");
    });

    it("Should return undefined for missing packages", function() {
      assert.isUndefined(readPackageJson("NOPE", FIXTURE_PROJECT_PATH));
      assert.isUndefined(readPackageJson("NOPE2", __dirname));
    });

    it("Should work without from param", function() {
      assert.isDefined(readPackageJson("mocha"));
    });
  });

  describe("loadPluginFile", function() {
    const globalAsAny = global as any;

    afterEach(function() {
      delete globalAsAny.loaded;
    });

    it("Should work when the plugin exports a function", function() {
      loadPluginFile(
        path.join(
          FIXTURE_PROJECT_PATH,
          "node_modules",
          "pack1",
          "plugin-with-function.js"
        )
      );

      assert.isTrue(globalAsAny.loaded);
    });

    it("Should work when the plugin exports a function with exports.default", function() {
      loadPluginFile(
        path.join(
          FIXTURE_PROJECT_PATH,
          "node_modules",
          "pack1",
          "plugin-with-function-default-export.js"
        )
      );

      assert.isTrue(globalAsAny.loaded);
    });

    it("Should work when the plugin doesn't export a function", function() {
      loadPluginFile(
        path.join(
          FIXTURE_PROJECT_PATH,
          "node_modules",
          "pack1",
          "plugin-without-function.js"
        )
      );

      assert.isTrue(globalAsAny.loaded);
    });
  });

  describe("loadPluginFile", function() {
    const globalAsAny = global as any;
    const projectPath = path.join(
      FIXTURE_PROJECT_PATH,
      "doesnt-need-to-exist-config.js"
    );
    let ctx: BuidlerContext;

    beforeEach(function() {
      ctx = BuidlerContext.createBuidlerContext();
    });

    afterEach(function() {
      BuidlerContext.deleteBuidlerContext();
      delete globalAsAny.loaded;
    });

    it("Should load a plugin if it has no peer dependency", function() {
      usePlugin(ctx, "pack1", projectPath);
      assert.isTrue(globalAsAny.loaded);
    });

    it("Shouldn't load a plugin twice", function() {
      usePlugin(ctx, "pack1", projectPath);
      assert.isTrue(globalAsAny.loaded);

      globalAsAny.loaded = false;

      usePlugin(ctx, "pack1", projectPath);
      assert.isFalse(globalAsAny.loaded);
    });

    it("Should load a plugin if it has all of its dependencies", function() {
      usePlugin(ctx, "requires-pack1", projectPath);
      assert.isTrue(globalAsAny.loaded);
    });

    it("Should fail if a peer dependency is missing", function() {
      expectBuidlerError(
        () => usePlugin(ctx, "requires-missing-pack", projectPath),
        ERRORS.PLUGINS.MISSING_DEPENDENCY
      );
    });

    it("Should fail if a peer dependency has an incompatible version", function() {
      expectBuidlerError(
        () => usePlugin(ctx, "requires-other-version-pack1", projectPath),
        ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH
      );
    });

    it("Should fail if the plugin isn't installed", function() {
      expectBuidlerError(
        () => usePlugin(ctx, "not-installed", projectPath),
        ERRORS.PLUGINS.NOT_INSTALLED
      );
    });
  });

  describe("ensurePluginLoadedWithUsePlugin", function() {
    const globalAsAny = global as any;

    const pluginFile = require.resolve(
      path.join(
        FIXTURE_PROJECT_PATH,
        "node_modules",
        "validates-import-style",
        "index.js"
      )
    );

    afterEach(function() {
      delete globalAsAny.loaded;
      delete require.cache[pluginFile];
    });

    it("Should do nothing special if loadPluginFile is used", function() {
      loadPluginFile(pluginFile);

      assert.isTrue(globalAsAny.loaded);
    });

    it("Should throw if imported with a require", function() {
      expectBuidlerError(
        () => require(pluginFile),
        ERRORS.PLUGINS.OLD_STYLE_IMPORT_DETECTED
      );
    });
  });
});
