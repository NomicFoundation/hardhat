import { assert } from "chai";

import { getConfig, getNetworkConfig } from "../../../src/core/config/config";
import { ERRORS } from "../../../src/core/errors";
import { getLocalCompilerVersion } from "../../helpers/compiler";
import { expectBuidlerError } from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

describe("config", () => {
  describe("custom config", () => {
    useFixtureProject("config-project");

    it("should fail on getting non existent network config", () => {
      const [config, _] = getConfig();
      expectBuidlerError(() => {
        getNetworkConfig(config, "local");
      }, ERRORS.NETWORK_CONFIG_NOT_FOUND);
    });

    it("should return the selected network config", () => {
      const [config, _] = getConfig();
      assert.equal(
        getNetworkConfig(config, "develop"),
        config.networks.develop
      );
    });

    it("should return the config merged ", () => {
      const [config, tasks] = getConfig();

      assert.equal(config.solc.version, getLocalCompilerVersion());
      assert.containsAllKeys(config.networks, ["auto", "develop", "custom"]);
      assert.containsAllKeys(tasks, [
        "clean",
        "flatten",
        "compile",
        "help",
        "run",
        "test"
      ]);
    });

    it("should return the config merged ", () => {
      const [config, tasks] = getConfig();
      assert.equal(config.solc.version, getLocalCompilerVersion());
      assert.containsAllKeys(config.networks, ["auto", "develop", "custom"]);
      assert.equal(config.networks.develop.port, 8545);
    });
  });

  describe("default config", () => {
    useFixtureProject("default-config-project");

    it("should return the default config", () => {
      const [config, tasks] = getConfig();
      assert.equal(config.solc.version, getLocalCompilerVersion());
      assert.containsAllKeys(config.networks, ["auto", "develop"]);
      assert.containsAllKeys(tasks, [
        "clean",
        "flatten",
        "compile",
        "help",
        "run",
        "test"
      ]);
    });

    it("should remove things from global state", () => {
      const globalAsAny: any = global;
      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
    });

    it("should return config with overridden tasks", () => {});
  });
});
