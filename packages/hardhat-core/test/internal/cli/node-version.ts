import { assert } from "chai";
import semver from "semver";

import { getPackageJson } from "../../../src/internal/util/packageInfo";
import { SUPPORTED_NODE_VERSIONS } from "../../../src/internal/cli/constants";

describe("supported node.js versions", function () {
  it("supported versions should match the engines field", async function () {
    const packageJson = await getPackageJson();
    const nodeEngines = packageJson.engines.node;

    for (const supportedNodeVersion of SUPPORTED_NODE_VERSIONS) {
      assert.isTrue(
        semver.intersects(supportedNodeVersion, nodeEngines),
        `supported node version ${supportedNodeVersion} doesn't intersect with engines field ${nodeEngines}`
      );
    }
  });
});
