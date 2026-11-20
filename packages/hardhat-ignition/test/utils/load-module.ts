import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { loadModule } from "../../src/internal/utils/load-module.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("loadModule", function () {
  useEphemeralIgnitionProject("user-modules");

  it("should throw if the full path to the module does not exist", async () => {
    await assertRejectsWithHardhatError(
      loadModule("ignition", "./ignition/modules/Fake.js"),
      HardhatError.ERRORS.IGNITION.INTERNAL.MODULE_NOT_FOUND_AT_PATH,
      { modulePath: "./ignition/modules/Fake.js" },
    );
  });

  it("should throw if the full path to the module is outside the module directory", async () => {
    await assertRejectsWithHardhatError(
      loadModule("ignition", "./hardhat.config.js"),
      HardhatError.ERRORS.IGNITION.INTERNAL.MODULE_OUTSIDE_MODULE_DIRECTORY,
      {
        modulePath: "./hardhat.config.js",
        shortModulesDirectoryName:
          process.platform === "win32"
            ? "ignition\\modules"
            : "ignition/modules",
      },
    );
  });
});
