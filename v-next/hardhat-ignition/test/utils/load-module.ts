/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { loadModule } from "../../src/utils/load-module.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("loadModule", function () {
  useEphemeralIgnitionProject("user-modules");

  it("should throw if the full path to the module does not exist", () => {
    assert.throws(
      () => loadModule("ignition", "./ignition/modules/Fake.js"),
      "Could not find a module file at the path: ./ignition/modules/Fake.js",
    );
  });

  it("should throw if the full path to the module is outside the module directory", () => {
    const unixErrorMessage = `The referenced module file ./hardhat.config.js is outside the module directory ignition/modules`;

    const expectedErrorMessage =
      process.platform === "win32"
        ? unixErrorMessage.replace("ignition/modules", "ignition\\modules")
        : unixErrorMessage;

    assert.throws(
      () => loadModule("ignition", "./hardhat.config.js"),
      expectedErrorMessage,
    );
  });
});
