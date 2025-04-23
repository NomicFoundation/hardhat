import { assert } from "chai";

import { loadModule } from "../../src/internal/utils/load-module.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("loadModule", function () {
  useEphemeralIgnitionProject("user-modules");

  it("should throw if the full path to the module does not exist", async () => {
    await assert.isRejected(
      loadModule("ignition", "./ignition/modules/Fake.js"),
      'Could not find a module file at the path: "./ignition/modules/Fake.js"',
    );
  });

  it("should throw if the full path to the module is outside the module directory", async () => {
    const unixErrorMessage = `The referenced module file "./hardhat.config.js" is outside the module directory "ignition/modules"`;

    const expectedErrorMessage =
      process.platform === "win32"
        ? unixErrorMessage.replace("ignition/modules", "ignition\\modules")
        : unixErrorMessage;

    await assert.isRejected(
      loadModule("ignition", "./hardhat.config.js"),
      expectedErrorMessage,
    );
  });
});
