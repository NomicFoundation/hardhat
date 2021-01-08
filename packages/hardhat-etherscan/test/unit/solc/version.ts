import { assert } from "chai";
import { HardhatPluginError } from "hardhat/plugins";
// tslint:disable: no-implicit-dependencies
import nock from "nock";
import semver from "semver";

import { decodeSolcMetadata } from "../../../src/solc/metadata";
import { getLongVersion } from "../../../src/solc/version";

describe("solc version retrieval tests", () => {
  it("solc version with commit is returned", async () => {
    nock("https://solc-bin.ethereum.org")
      .get("/bin/list.json")
      .reply(200, {
        releases: {
          "0.5.1": "soljson-v0.5.1-commitsomething.js",
        },
      });

    const fullVersion = await getLongVersion("0.5.1");
    assert.equal(fullVersion, "v0.5.1-commitsomething");
  });

  it("an exception is thrown if there was an error sending request", async () => {
    nock("https://solc-bin.ethereum.org").get("/bin/list.json").reply(404);

    return getLongVersion("0.5.1").catch((e) =>
      assert.isTrue(e instanceof HardhatPluginError)
    );
  });

  it("an exception is thrown if the specified version doesn't exist", async () => {
    nock("https://solc-bin.ethereum.org")
      .get("/bin/list.json")
      .reply(200, {
        releases: {
          "0.5.2": "soljson-v0.5.2-commitsomething.js",
        },
      });

    return getLongVersion("0.5.1")
      .then(() => {
        assert.fail();
      })
      .catch((e) => {
        assert.isTrue(e instanceof HardhatPluginError);
      });
  });
});
