/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { emptyDirSync, readdir } from "fs-extra";
import path from "path";

import { useEphemeralIgnitionProject } from "../use-ignition-project";

describe("plan", () => {
  useEphemeralIgnitionProject("minimal");

  it("should create a plan", async function () {
    const planPath = path.resolve("../minimal/cache/plan");
    emptyDirSync(planPath);

    await this.hre.run("compile", { quiet: true });
    await this.hre.run("plan", {
      quiet: true,
      moduleNameOrPath: "MyModule.js",
    });

    const files = await readdir(planPath);

    assert(files.includes("index.html"));
  });
});
