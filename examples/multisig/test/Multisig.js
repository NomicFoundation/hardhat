const { expect } = require("chai");
const { ethers } = require("ethers");

const Multisig = require("../ignition/Multisig");

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe.skip("Multisig", function () {
  let multisig;

  before(async () => {
    const moduleResult = await ignition.deploy(Multisig);

    multisig = moduleResult.multisig;
  });

  it("should store a submitted transaction", async function () {
    const submittedTx = await multisig.functions.transactions(0);

    expect(submittedTx.destination).to.equal(ACCOUNT_0);
    expect(submittedTx.value.toString()).to.equal(
      ethers.utils.parseUnits("50").toString()
    );
    expect(submittedTx.data).to.equal("0x00");
    expect(submittedTx.executed).to.equal(false);
  });

  it("should confirm a stored transaction", async function () {
    const [isConfirmed] = await multisig.functions.confirmations(0, ACCOUNT_0);

    expect(isConfirmed).to.equal(true);
  });
});
