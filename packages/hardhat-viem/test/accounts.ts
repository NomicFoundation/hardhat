import { expect } from "chai";
import sinon from "sinon";
import { getAccounts } from "../src/internal/accounts";
import { EthereumMockedProvider } from "./mocks/provider";

describe("getAccounts", function () {
  it("calls eth_accounts on provider, falling back to empty array if deprecated", async function () {
    const provider = new EthereumMockedProvider();

    sinon.stub(provider, "send").callsFake(async (method) => {
      if (method === "eth_accounts") {
        throw new Error("the method has been deprecated: eth_accounts");
      }
    });

    const accounts = await getAccounts(provider);

    expect(accounts).to.deep.equal([]);
  });
});
