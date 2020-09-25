import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { ALCHEMY_URL } from "../../../setup";

describe("HttpProvider", function () {
  describe("429 Too many requests - retries", function () {
    it("Retries are correctly handled for Alchemy", async function () {
      if (ALCHEMY_URL === undefined) {
        this.skip();
        return;
      }

      const provider = new HttpProvider(ALCHEMY_URL, "Alchemy");

      // We just make a bunch of requests that would otherwise fail
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          provider.request({
            method: "eth_getTransactionCount",
            params: ["0x6b175474e89094c44da98b954eedeac495271d0f", "0x12"],
          })
        );
      }

      await Promise.all(requests);
    });
  });
});
