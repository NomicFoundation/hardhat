/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import fs from "fs-extra";
import path from "path";

import { useEnvironment } from "../useEnvironment";

describe("plan", () => {
  // TODO: rename back to minimal api once execution switched over
  useEnvironment("minimal-new-api");

  it("should create a plan", async function () {
    const planPath = path.resolve("../minimal-new-api/cache/plan");
    fs.emptyDirSync(planPath);

    await this.hre.run("compile", { quiet: true });
    await this.hre.run("plan", {
      quiet: true,
      moduleNameOrPath: "MyModule.js",
    });

    const files = await fs.readdir(planPath);

    assert(files.includes("index.html"));
  });
});
