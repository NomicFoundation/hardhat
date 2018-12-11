import { BuidlerError, ErrorDescription } from "../../src/core/errors";
import { useFixtureProject } from "../helpers/project";
import { assert } from "chai";
import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";

describe("Buidler lib", () => {
  let environment: BuidlerRuntimeEnvironment;
  useFixtureProject("config-project");

  before(() => {
    environment = require("../../src/lib/buidler-lib").default;
  })

  it("should load environment", () => {
    assert.isDefined(environment.config.networks["custom"]);
  });

  it("should load task user defined task", async () => {
    assert.isDefined(environment.tasks['example'])
    assert.equal(await environment.run("example"), 28)
  })
});
