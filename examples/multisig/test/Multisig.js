const { expect } = require("chai");
const { ethers } = require("ethers");

const Multisig = require("../ignition/Multisig");

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("Multisig", function () {
  let multisig;
  let event;

  before(async () => {
    const moduleResult = await ignition.deploy(Multisig);

    multisig = moduleResult.multisig;
    event = moduleResult.event;
  });

  it("should confirm a stored transaction", async function () {
    const [isConfirmed] = await multisig.functions.confirmations(0, ACCOUNT_0);

    expect(isConfirmed).to.equal(true);
  });

  it("should emit the sender and transaction id after confirming a stored transaction", async function () {
    expect(event.sender).to.equal(ACCOUNT_0);
    expect(ethers.BigNumber.from("0").eq(event.transactionId)).to.be.true;
  });

  it("should execute a confirmed transaction", async function () {
    const submittedTx = await multisig.functions.transactions(0);

    expect(submittedTx.destination).to.equal(ACCOUNT_0);
    expect(submittedTx.value.toString()).to.equal(
      ethers.utils.parseUnits("50").toString()
    );
    expect(submittedTx.data).to.equal("0x00");
    expect(submittedTx.executed).to.equal(true);
  });
});
