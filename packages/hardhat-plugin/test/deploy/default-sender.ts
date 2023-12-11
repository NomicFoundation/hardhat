/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("default sender", function () {
  useEphemeralIgnitionProject("minimal");

  it("should allow setting default sender via cli", async function () {
    await assert.isRejected(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "ignition/modules/MyModule.js",
          defaultSender: "0xtest",
        }
      ),
      /IGN700: Default sender 0xtest is not part of the configured accounts./
    );
  });
});
