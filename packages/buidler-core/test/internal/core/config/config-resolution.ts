import { assert } from "chai";
import * as path from "path";

import { BuidlerContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { resolveProjectPaths } from "../../../../src/internal/core/config/config-resolution";
import { DEFAULT_SOLC_VERSION } from "../../../../src/internal/core/config/default-config";
import { resetBuidlerContext } from "../../../../src/internal/reset";
import { HardhatNetworkConfig, HttpNetworkConfig } from "../../../../src/types";
import { useFixtureProject } from "../../../helpers/project";

describe("Config resolution", () => {
  beforeEach(() => {
    BuidlerContext.createBuidlerContext();
  });

  afterEach(() => {
    resetBuidlerContext();
  });

  describe("Default config merging", () => {
    describe("With default config", () => {
      useFixtureProject("default-config-project");

      it("should return the default config", () => {
        const config = loadConfigAndTasks();
        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(
          config.solidity.compilers[0].version,
          DEFAULT_SOLC_VERSION
        );
        assert.containsAllKeys(config.networks, ["localhost"]);
        assert.isUndefined(config.solidity.compilers[0]?.settings?.evmVersion);
        assert.equal(config.defaultNetwork, "hardhat");

        const buidlerEvmConfig: HardhatNetworkConfig = config.networks
          .hardhat as HardhatNetworkConfig;

        assert.equal(buidlerEvmConfig.throwOnTransactionFailures, true);
        assert.equal(buidlerEvmConfig.throwOnCallFailures, true);
      });
    });

    describe("With custom config", () => {
      useFixtureProject("config-project");

      it("should return the config merged ", () => {
        const config = loadConfigAndTasks();

        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(
          config.solidity.compilers[0].version,
          DEFAULT_SOLC_VERSION
        );
        assert.containsAllKeys(config.networks, ["localhost", "custom"]);
        assert.equal(config.defaultNetwork, "custom");
      });

      it("should return the config merged ", () => {
        const config = loadConfigAndTasks();
        assert.lengthOf(config.solidity.compilers, 1);
        assert.equal(
          config.solidity.compilers[0].version,
          DEFAULT_SOLC_VERSION
        );
        assert.containsAllKeys(config.networks, ["localhost", "custom"]);
        assert.equal(
          (config.networks.localhost as HttpNetworkConfig).url,
          "http://127.0.0.1:8545"
        );
        assert.deepEqual(config.networks.localhost.accounts, [
          "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
        ]);
      });

      it("should keep any unknown field", () => {
        const config = loadConfigAndTasks() as any;
        assert.deepEqual(config.unknown, { asd: 123 });
      });
    });

    describe("With custom solidity", () => {
      useFixtureProject("custom-solidity-config");

      it("should return the user's solidity config", () => {
        const config = loadConfigAndTasks();
        const solidityConfig: any = config.solidity;

        assert.deepEqual(solidityConfig, {
          compilers: [
            { version: "0.5.5", optimizer: { enabled: false, runs: 200 } },
            { version: "0.6.7", optimizer: { enabled: false, runs: 200 } },
          ],
        });
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
      Object.values(paths).forEach((p) => assert.isTrue(path.isAbsolute(p)));
    });

    it("Should use absolute paths 'as is'", () => {
      const paths = resolveProjectPaths(__filename, {
        asd: "/asd",
        root: "/root",
        sources: "/c",
        artifacts: "/a",
        cache: "/ca",
        tests: "/t",
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
        root: "blah",
      });

      assert.equal(paths.root, path.join(__dirname, "blah"));
    });

    it("Should resolve the rest relative to the root", () => {
      const paths = resolveProjectPaths(__filename, {
        root: "blah",
        asdf: "asd",
        sources: "c",
        artifacts: "a",
        cache: "ca",
        tests: "t",
      });

      const root = path.join(__dirname, "blah");
      assert.equal(paths.root, root);
      assert.equal((paths as any).asdf, path.join(root, "asd"));
      assert.equal(paths.sources, path.join(root, "c"));
      assert.equal(paths.artifacts, path.join(root, "a"));
      assert.equal(paths.cache, path.join(root, "ca"));
      assert.equal(paths.tests, path.join(root, "t"));
    });

    it("Should have the right default values", () => {
      const paths = resolveProjectPaths(__filename);
      assert.equal(paths.root, __dirname);
      assert.equal(paths.sources, path.join(__dirname, "contracts"));
      assert.equal(paths.artifacts, path.join(__dirname, "artifacts"));
      assert.equal(paths.cache, path.join(__dirname, "cache"));
      assert.equal(paths.tests, path.join(__dirname, "test"));
    });
  });
});
