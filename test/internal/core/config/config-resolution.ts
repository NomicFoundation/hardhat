import { assert } from "chai";
import * as path from "path";

import { BuidlerContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { resolveProjectPaths } from "../../../../src/internal/core/config/config-resolution";
import { getLocalCompilerVersion } from "../../../helpers/compiler";
import { resetBuidlerContext } from "../../../helpers/context";
import { useFixtureProject } from "../../../helpers/project";
import { HttpNetworkConfig } from "../../../types";

describe("Config resolution", () => {
  beforeEach(() => {
    BuidlerContext.createBuidlerContext();
  });
  afterEach(async () => {
    await resetBuidlerContext();
  });
  describe("Default config merging", () => {
    describe("With default config", () => {
      useFixtureProject("default-config-project");

      it("should return the default config", () => {
        const config = loadConfigAndTasks();
        assert.equal(config.solc.version, getLocalCompilerVersion());
        assert.containsAllKeys(config.networks, ["auto", "develop"]);
        assert.equal(config.solc.evmVersion, "petersburg");
      });
    });

    describe("With custom config", () => {
      useFixtureProject("config-project");

      it("should return the config merged ", () => {
        const config = loadConfigAndTasks();

        assert.equal(config.solc.version, getLocalCompilerVersion());
        assert.containsAllKeys(config.networks, ["auto", "develop", "custom"]);
      });

      it("should return the config merged ", () => {
        const config = loadConfigAndTasks();
        assert.equal(config.solc.version, getLocalCompilerVersion());
        assert.containsAllKeys(config.networks, ["auto", "develop", "custom"]);
        assert.equal(
          (config.networks.develop as HttpNetworkConfig).url,
          "http://127.0.0.1:8545"
        );
        assert.deepEqual(config.networks.develop.accounts, [
          "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
        ]);
      });
    });
  });

  describe("Paths resolution", () => {
    it("Doesn't override paths.configFile", () => {
      const paths = resolveProjectPaths(__filename, { configFile: "asd" });
      assert.equal(paths.configFile, __filename);
    });

    it("Should return absolute paths", () => {
      const paths = resolveProjectPaths(__filename, { asd: "asd" });
      Object.values(paths).forEach(p => assert.isTrue(path.isAbsolute(p)));
    });

    it("Should use absolute paths 'as is'", () => {
      const paths = resolveProjectPaths(__filename, {
        asd: "/asd",
        root: "/root",
        sources: "/c",
        artifacts: "/a",
        cache: "/ca",
        tests: "/t"
      });

      assert.equal(paths.root, "/root");
      assert.equal((paths as any).asd, "/asd");
      assert.equal(paths.sources, "/c");
      assert.equal(paths.artifacts, "/a");
      assert.equal(paths.cache, "/ca");
      assert.equal(paths.tests, "/t");
    });

    it("Should resolve the root relative to the configFile", () => {
      const paths = resolveProjectPaths(__filename, {
        root: "blah"
      });

      assert.equal(paths.root, __dirname + "/blah");
    });

    it("Should resolve the rest relative to the root", () => {
      const paths = resolveProjectPaths(__filename, {
        root: "blah",
        asdf: "asd",
        sources: "c",
        artifacts: "a",
        cache: "ca",
        tests: "t"
      });

      const root = __dirname + "/blah";
      assert.equal(paths.root, root);
      assert.equal((paths as any).asdf, root + "/asd");
      assert.equal(paths.sources, root + "/c");
      assert.equal(paths.artifacts, root + "/a");
      assert.equal(paths.cache, root + "/ca");
      assert.equal(paths.tests, root + "/t");
    });

    it("Should have the right default values", () => {
      const paths = resolveProjectPaths(__filename);
      assert.equal(paths.root, __dirname);
      assert.equal(paths.sources, __dirname + "/contracts");
      assert.equal(paths.artifacts, __dirname + "/artifacts");
      assert.equal(paths.cache, __dirname + "/cache");
      assert.equal(paths.tests, __dirname + "/test");
    });
  });
});
