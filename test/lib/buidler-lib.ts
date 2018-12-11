import { assert } from "chai";

import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";
import { useFixtureProject } from "../helpers/project";

describe("Buidler lib", () => {
  let environment: BuidlerRuntimeEnvironment;
  useFixtureProject("config-project");

  before(() => {
    environment = require("../../src/lib/buidler-lib").default;
  });

  it("should load environment", () => {
    assert.isDefined(environment.config.networks.custom);
  });

  it("should load task user defined task", async () => {
    assert.isDefined(environment.tasks.example2);
    assert.equal(await environment.run("example2"), 28);
  });

  it("should reuse global state", async () => {
    let e: any;
    e = environment;
    environment = require("../../src/lib/buidler-lib").default;
    assert.isTrue(e === environment);

    // delete the cached version of buidler lib exported module.
    delete require.cache[require.resolve("../../src/lib/buidler-lib")];

    environment = require("../../src/lib/buidler-lib").default;
    assert.equal(await environment.run("example"), 28);
    assert.isFalse(e === environment);
  });

  it("should reuse global state", async () => {
    assert.equal(await environment.run("example"), 28);
  });
});
