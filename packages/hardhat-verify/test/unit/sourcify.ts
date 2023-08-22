import { assert } from "chai";
import { Sourcify } from "../../src/sourcify";

describe("Sourcify", () => {
  const chainId = 100;

  describe("getContractUrl", () => {
    it("should return the contract url", () => {
      const expectedContractAddress =
        "https://repo.sourcify.dev/contracts/full_match/100/0xC4c622862a8F548997699bE24EA4bc504e5cA865/";
      let sourcify = new Sourcify(chainId);
      let contractUrl = sourcify.getContractUrl(
        "0xC4c622862a8F548997699bE24EA4bc504e5cA865",
        "perfect"
      );

      assert.equal(contractUrl, expectedContractAddress);
    });
  });
});
