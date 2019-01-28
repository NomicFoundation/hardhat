const assert = require("assert");

describe("Ethereum provider", function() {
  it("Should return the accounts", async function() {
    const accounts = await provider.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});
