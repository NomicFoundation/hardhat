import { assert } from "chai";

import { loadConfigAndTasks } from "../../../src/core/config/config-loading";
import { getNetworkConfig } from "../../../src/core/config/network";
import { ERRORS } from "../../../src/core/errors";
import { expectBuidlerError } from "../../helpers/errors";
import { useFixtureProject } from "../../helpers/project";

describe("network config", () => {
  useFixtureProject("config-project");

  it("should fail on getting non existent network config", () => {
    const [config, _] = loadConfigAndTasks();
    expectBuidlerError(() => {
      getNetworkConfig(config, "local");
    }, ERRORS.NETWORK_CONFIG_NOT_FOUND);
  });

  it("should return the selected network config", () => {
    const [config, _] = loadConfigAndTasks();
    assert.equal(getNetworkConfig(config, "develop"), config.networks.develop);
  });
});
