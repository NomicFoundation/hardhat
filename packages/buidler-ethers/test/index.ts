import { assert } from "chai";

describe("Ethers plugin", function() {
  before("Buidler project setup", function() {
    process.chdir(__dirname + "/buidler-project");
    process.env.BUIDLER_NETWORK = "develop";

    delete require.cache[require.resolve("@nomiclabs/buidler")];
    this.env = require("@nomiclabs/buidler");
  });

  it("should extend buidler runtime environment", function() {
    assert.isDefined(this.env.ethers);
    assert.containsAllKeys(this.env.ethers, [
      "provider",
      "getContract",
      "signers"
    ]);
  });

  it("the provider should handle requests", async function() {
    const accounts = await this.env.ethers.provider.send("eth_accounts");
    assert.deepEqual(accounts, ["0xf7abeea1b1b97ef714bc9a118b0f095ec54f8221"]);
  });

  it("should return a contract factory", async function() {
    // It's already compiled in artifacts/
    const contract = await this.env.ethers.getContract("Greeter");

    assert.containsAllKeys(contract.interface.functions, [
      "setGreeting(string)",
      "greet()"
    ]);
  });

  it("should return a contract factory for an interface", async function() {
    const contract = await this.env.ethers.getContract("IGreeter");
    assert.equal(contract.bytecode, "0x");
    assert.containsAllKeys(contract.interface.functions, ["greet()"]);
  });

  it("should return the signers", async function() {
    const signers = await this.env.ethers.signers();
    assert.equal(
      await signers[0].getAddress(),
      "0xF7ABeeA1B1B97Ef714bc9A118B0f095EC54f8221"
    );
  });
});
