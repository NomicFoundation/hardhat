/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { emptyDirSync, readdir } from "fs-extra";
import path from "path";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("visualize", () => {
  useEphemeralIgnitionProject("minimal");

  it("should create a visualization", async function () {
    const visualizationPath = path.resolve("../minimal/cache/visualization");
    emptyDirSync(visualizationPath);

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
