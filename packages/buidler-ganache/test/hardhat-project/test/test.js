const assert = require("assert");

describe("Tests using the ganache plugin", function () {
  it("Ganache must be accessible", async function () {
    const accounts = await ethereum.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});
