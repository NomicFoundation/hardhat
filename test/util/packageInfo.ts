import { getPackageJson, getPackageRoot } from "../../src/util/packageInfo";
import { assert } from "chai";
import fsExtra from "fs-extra";

describe("packageInfo", () => {
  it("Should give the right package.json", async () => {
    const packageJson = await getPackageJson();
    assert.equal(packageJson.name, "buidler");
    // We don't test the version number because that would be hard to maintain
    assert.isString(packageJson.version);
  });

  it("should give the right package root", async () => {
    const root = await fsExtra.realpath(__dirname + "/../..");
    assert.equal(await getPackageRoot(), root);
  });
});
