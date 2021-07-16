import { assert, expect } from "chai";
import { HardhatPluginError } from "hardhat/plugins";
import nock from "nock";

import { getLongVersion } from "../../../src/solc/version";

describe("solc version retrieval unit tests", function () {
  before(function () {
    nock.disableNetConnect();
  });

  after(function () {
    nock.enableNetConnect();
  });

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

    return getLongVersion("0.5.1")
      .then(() => assert.fail("Should fail when response has status 404."))
      .catch((error) => {
        assert.instanceOf(error, HardhatPluginError);
        expect(error.message)
          .to.be.a("string")
          .and.include("Failed to obtain list of solc versions.");
      });
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
      .then(() =>
        assert.fail(
          "Should fail when response is missing the sought compiler version."
        )
      )
      .catch((error) => {
        assert.instanceOf(error, HardhatPluginError);
        expect(error.message)
          .to.be.a("string")
          .and.include("Given solc version doesn't exist");
      });
  });
});
