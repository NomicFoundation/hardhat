import { assert } from "chai";

import { resetBuidlerContext } from "../../helpers/context";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";

describe("Buidler lib", () => {
  useFixtureProject("config-project");

  useEnvironment(true);

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
    let environment = require("../../../src/internal/lib/buidler-lib");
    assert.isTrue(this.env === environment);
    await resetBuidlerContext();
    environment = require("../../../src/internal/lib/buidler-lib");
    assert.equal(await environment.run("example"), 28);
    assert.isFalse(this.env === environment);
  });
});
