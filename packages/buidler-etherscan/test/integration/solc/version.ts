import { assert } from "chai";

import { SolcVersionNumber } from "../../../src/solc/version";

describe("solc version retrieval integration tests", () => {
  it("verify full solc version is returned", async () => {
    const version = new SolcVersionNumber(0, 5, 1);
    const fullVersion = await version.getLongVersion();
    assert.equal(fullVersion, "v0.5.1+commit.c8a2cb62");
  });
});
