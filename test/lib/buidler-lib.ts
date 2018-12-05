import { BuidlerError, ErrorDescription } from "../../src/core/errors";
import { useFixtureProject } from "../helpers/project";
import { assert } from "chai";
import { BuidlerRuntimeEnvironment } from "../../src/core/runtime-environment";

describe("BuilderError", () => {
  let environment: BuidlerRuntimeEnvironment
  useFixtureProject("config-project")

  before(() => {
    environment = require('../../src/lib/buidler-lib').default
  })

  it("should load environment", () => {
    console.log(environment.config.networks);
    console.log(environment)
    assert.isDefined(environment.config.networks)
  })
});
