import { assert } from "chai";
import path from "path";

import {
  getPackageJson,
  getPackageRoot,
} from "../../../src/internal/util/packageInfo";
import { getRealPath } from "../../../src/internal/util/fs-utils";

describe("packageInfo", () => {
  it("Should give the right package.json", async () => {
    const packageJson = await getPackageJson();
    assert.strictEqual(packageJson.name, "hardhat");
    // We don't test the version number because that would be hard to maintain
    assert.isString(packageJson.version);
  });

  it("should give the right package root", async () => {
    const root = await getRealPath(path.join(__dirname, "..", "..", ".."));
    assert.strictEqual(getPackageRoot(), root);
  });
});
