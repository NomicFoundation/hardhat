import { assert } from "chai";

import { buildContractUrl } from "../../src/util";

describe("utils", function () {
  describe("buildContractUrl", () => {
    it("should work for URLs without paths and no trailing slash", function () {
      const contractUrl = buildContractUrl("https://example.com", "0x123");

      assert.equal(contractUrl, "https://example.com/address/0x123#code");
    });

    it("should work for URLs without paths and a trailing slash", function () {
      const contractUrl = buildContractUrl("https://example.com/", "0x123");

      assert.equal(contractUrl, "https://example.com/address/0x123#code");
    });

    it("should work for URLs with paths and no trailing slash", function () {
      const contractUrl = buildContractUrl(
        "https://example.com/chain/1",
        "0x123"
      );

      assert.equal(
        contractUrl,
        "https://example.com/chain/1/address/0x123#code"
      );
    });

    it("should work for URLs with paths and a trailing slash", function () {
      const contractUrl = buildContractUrl(
        "https://example.com/chain/1/",
        "0x123"
      );

      assert.equal(
        contractUrl,
        "https://example.com/chain/1/address/0x123#code"
      );
    });
  });
});
