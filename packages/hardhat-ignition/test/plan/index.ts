import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { emptyDir, readdir } from "@nomicfoundation/hardhat-utils/fs";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("visualize", () => {
  const project = useEphemeralIgnitionProject("minimal");

  it("should create a visualization", async function () {
    const visualizationPath = path.resolve("cache/visualization");
    await emptyDir(visualizationPath);

    await project.hre.tasks.getTask("build").run({ quiet: true });
    await project.hre.tasks.getTask(["ignition", "visualize"]).run({
      noOpen: true,
      modulePath: "./ignition/modules/MyModule.js",
    });

    const files = await readdir(visualizationPath);

    assert(files.includes("index.html"));
  });
});
