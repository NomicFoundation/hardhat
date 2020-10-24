const assert = require("assert");

describe("Tests using the ganache plugin", function () {
  it("Ganache must be accessible", async function () {
    const accounts = await network.provider.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});
