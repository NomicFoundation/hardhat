/* eslint-disable import/no-unused-modules */
import path from "node:path";

import { emptyDir, readdir } from "@ignored/hardhat-vnext-utils/fs";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// TODO: Bring back with Hardhat 3 fixtures
describe.skip("visualize", () => {
  useEphemeralIgnitionProject("minimal");

  it("should create a visualization", async function () {
    const visualizationPath = path.resolve("../minimal/cache/visualization");
    await emptyDir(visualizationPath);

    await this.hre.run("compile", { quiet: true });
    await this.hre.run(
      {
        scope: "ignition",
        task: "visualize",
      },
      {
        noOpen: true,
        modulePath: "./ignition/modules/MyModule.js",
      },
    );

    const files = await readdir(visualizationPath);

    assert(files.includes("index.html"));
  });
});
