import { assert, expect } from "chai";
import { getConfig, getNetworkConfig } from "../../src/core/config";
import { BuidlerError, ERRORS, ErrorDescription } from "../../src/core/errors";

function assertCorrectError(f: () => any, error: ErrorDescription) {
  expect(f)
    .to.throw(BuidlerError)
    .with.property("number", error.number);
}

describe("config", () => {
  let cwd: string;
  let path: string;
  describe("custom config", () => {
    before(() => {
      path = "test/features/config-project";
    });
    beforeEach(() => {
      cwd = process.cwd();
      process.chdir(path);
    });
    afterEach(() => {
      process.chdir(cwd);
    });

    it("should fail on getting non existent network config", () => {
      const [config, _] = getConfig();
      assertCorrectError(() => {
        getNetworkConfig(config, "local");
      }, ERRORS.NETWORK_CONFIG_NOT_FOUND);
    });

    it("should return the selected network config", () => {
      const [config, _] = getConfig();
      assert.equal(
        getNetworkConfig(config, "develop"),
        config.networks["develop"]
      );
    });

    it("should return the config merged ", () => {
      const [config, tasks] = getConfig();

      assert.equal(config.solc.version, "0.5.0");
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
      assert.equal(config.solc.version, "0.5.0");
      assert.containsAllKeys(config.networks, ["auto", "develop", "custom"]);
      assert.equal(config.networks.develop.port, 1337);
    });
  });

  describe("default config", () => {
    before(() => {
      path = "test/features/default-config-project";
    });
    beforeEach(() => {
      cwd = process.cwd();
      process.chdir(path);
    });
    afterEach(() => {
      process.chdir(cwd);
    });

    it("should return the default config", () => {
      const [config, tasks] = getConfig();
      assert.equal(config.solc.version, "0.5.0");
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
      assert.isUndefined(globalAsAny["internalTask"]);
      assert.isUndefined(globalAsAny["task"]);
    });

    it("should return config with overridden tasks", () => {});
  });
});
