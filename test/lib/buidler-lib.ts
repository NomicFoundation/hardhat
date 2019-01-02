import { assert } from "chai";

import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

describe("Buidler lib", () => {
  useFixtureProject("config-project");
  useEnvironment();

  before(() => {
    // TODO: This next line can be removed once 'auto' network gets back
    process.env.BUIDLER_NETWORK = "develop";
  });

  it("should load environment", function() {
    assert.isDefined(this.env.config!.networks!.custom);
  });

  it("should load task user defined task", async function() {
    assert.isDefined(this.env.tasks.example2);
    assert.equal(await this.env.run("example2"), 28);
  });

  it("should reuse global state", async function() {
    let environment = require("../../src/lib/buidler-lib");
    assert.isTrue(this.env === environment);

    // delete the cached version of buidler lib exported module.
    delete require.cache[require.resolve("../../src/lib/buidler-lib")];

    environment = require("../../src/lib/buidler-lib");
    assert.equal(await environment.run("example"), 28);
    assert.isFalse(this.env === environment);
  });
});
