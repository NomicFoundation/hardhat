import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { assert } from "chai";
// tslint:disable: no-implicit-dependencies
import nock from "nock";

import {
  InferralType,
  inferSolcVersion,
  SolcVersionNumber,
} from "../../../src/solc/version";

describe("solc version retrieval tests", () => {
  it("solc version with commit is returned", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
      .reply(200, {
        releases: {
          "0.5.1": "soljson-v0.5.1-commitsomething.js",
        },
      });

    const version = new SolcVersionNumber(0, 5, 1);
    const fullVersion = await version.getLongVersion();
    assert.equal(fullVersion, "v0.5.1-commitsomething");
  });

  it("an exception is thrown if there was an error sending request", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
      .reply(404);

    const version = new SolcVersionNumber(0, 5, 1);
    return version
      .getLongVersion()
      .catch((e) => assert.isTrue(e instanceof BuidlerPluginError));
  });

  it("an exception is thrown if the specified version doesn't exist", async () => {
    nock("https://raw.githubusercontent.com")
      .get("/ethereum/solc-bin/gh-pages/bin/list.json")
      .reply(200, {
        releases: {
          "0.5.2": "soljson-v0.5.2-commitsomething.js",
        },
      });

    const version = new SolcVersionNumber(0, 5, 1);
    return version
      .getLongVersion()
      .then(() => {
        assert.fail();
      })
      .catch((e) => {
        assert.isTrue(e instanceof BuidlerPluginError);
      });
  });
});

describe("solc version inferral tests", () => {
  describe("very old compiler inferral; these don't emit metadata", () => {
    /**
     * These tests require compiling a contract with solc v0.4.6 or earlier.
     * This is not currently possible with buidler out of the box.
     */
    it.skip("bytecode emitted by solc v0.4.6; the last version to feature no metadata", () => {});

    // We can test with gibberish instead
    it("when payload is gibberish", async () => {
      const payload = Buffer.from("This is no contract bytecode.");
      const versionRange = await inferSolcVersion(payload);
      assert.equal(
        versionRange.inferralType,
        InferralType.METADATA_ABSENT,
        "False positive in metadata detection"
      );

      const veryOldVersion = new SolcVersionNumber(0, 4, 6);
      assert.isTrue(
        versionRange.isIncluded(veryOldVersion),
        `${veryOldVersion} should be included in ${versionRange}`
      );

      const oldVersion = new SolcVersionNumber(0, 4, 7);
      assert.isFalse(
        versionRange.isIncluded(oldVersion),
        `${oldVersion} shouldn't be included in ${versionRange}`
      );
    });
  });

  describe("old compiler inferral; these embed metadata without solc version", () => {
    it.skip("bytecode emitted by solc v0.4.7; the first version to feature metadata", () => {});
  });

  describe("exact compiler version inferral", () => {});
});
