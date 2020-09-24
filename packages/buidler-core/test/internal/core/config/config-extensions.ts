// extendConfig must be available
// extendConfig shouldn't let me modify th user config
// config extenders must run in order
// config extensions must be visible

import { assert } from "chai";

import { HardhatContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { resetHardhatContext } from "../../../../src/internal/reset";
import { useEnvironment } from "../../../helpers/environment";
import { expectHardhatError } from "../../../helpers/errors";
import { useFixtureProject } from "../../../helpers/project";

describe("Config extensions", function () {
  describe("Valid extenders", function () {
    useFixtureProject("config-extensions");
    useEnvironment();

    it("Should expose the new values", function () {
      const config: any = this.env.config;
      assert.isDefined(config.values);
    });

    it("Should execute extenders in order", function () {
      const config: any = this.env.config;
      assert.deepEqual(config.values, [1, 2]);
    });
  });

  describe("Invalid extensions", function () {
    useFixtureProject("invalid-config-extension");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("Should throw the right error when trying to modify the user config", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.GENERAL.USER_CONFIG_MODIFIED
      );
    });

    it("Should have the right property path", function () {
      assert.throws(() => loadConfigAndTasks(), "userConfig.networks.asd");
    });
  });
});
