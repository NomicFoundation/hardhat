/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { emptyDirSync, readdir } from "fs-extra";
import path from "path";

import { useEphemeralIgnitionProject } from "../use-ignition-project";

// eslint-disable-next-line no-only-tests/no-only-tests
describe.only("plan", () => {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should create a plan", async function () {
    const planPath = path.resolve("../minimal-new-api/cache/plan");
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
