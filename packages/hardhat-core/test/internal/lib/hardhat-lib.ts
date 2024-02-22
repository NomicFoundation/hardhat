import { assert } from "chai";

import { resetHardhatContext } from "../../../src/internal/reset";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";

describe("Hardhat lib", () => {
  useFixtureProject("config-project");
  useEnvironment();

  before(() => {
    process.env.HARDHAT_NETWORK = "localhost";
  });

  it("should load environment", function () {
    assert.isDefined(this.env.config!.networks!.custom);
  });

  it("should load task user defined task", async function () {
    assert.isDefined(this.env.tasks.example2);
    assert.strictEqual(await this.env.run("example2"), 28);
  });

  it("should reuse global state", async function () {
    let environment = require("../../../src/internal/lib/hardhat-lib");
    assert.isTrue(this.env === environment);

    resetHardhatContext();

    environment = require("../../../src/internal/lib/hardhat-lib");
    assert.strictEqual(await environment.run("example"), 28);
    assert.isFalse(this.env === environment);
  });
});
