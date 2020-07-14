import { NomicLabsBuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { assert } from "chai";
// tslint:disable: no-implicit-dependencies
import nock from "nock";

import { getLongVersion } from "../../../src/solc/SolcVersions";

describe("SolcVersions tests", () => {
  it("verify full solc version is returned", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
      .reply(200, {
        releases: {
          "0.5.1": "soljson-v0.5.1-commitsomething.js",
        },
      });

    const fullVersion = await getLongVersion("0.5.1");
    assert.equal(fullVersion, "v0.5.1-commitsomething");
  });

  it("verify exception is throw if there was ean error sending request", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
      .reply(404);

    getLongVersion("0.5.1").catch((e) =>
      assert.isTrue(e instanceof NomicLabsBuidlerPluginError)
    );
  });

  it("verify exception is throw if there isn't specified version", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
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
        assert.isTrue(e instanceof NomicLabsBuidlerPluginError);
      });
  });
});
