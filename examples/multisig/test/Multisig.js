const { expect } = require("chai");
const { ethers } = require("ethers");

const Multisig = require("../ignition/MultisigModule");

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ACCOUNT_1 = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

describe("Multisig", function () {
  describe("a deploy broken up by an external call", () => {
    let multisig;

    this.beforeAll(async () => {
      const journal = new MemoryCommandJournal();

      try {
        await ignition.deploy(Multisig, {
          journal,
        });
      } catch (err) {
        // ignore
      }

      const moduleResult = await ignition.deploy(Multisig, {
        journal,
      });

      multisig = moduleResult.multisig;
    });

    it("should confirm a stored transaction", async function () {
      const [isConfirmed0] = await multisig.functions.confirmations(
        0,
        ACCOUNT_0
      );

      const [isConfirmed1] = await multisig.functions.confirmations(
        0,
        ACCOUNT_1
      );

      expect(isConfirmed0).to.equal(true);
      expect(isConfirmed1).to.equal(true);
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
});

class MemoryCommandJournal {
  constructor() {
    this.entries = [];
  }

  async record(command) {
    this.entries.push(JSON.stringify(command));
  }

  async *read() {
    for (const entry of this.entries) {
      const command = JSON.parse(entry);

      yield command;
    }
  }

  clear() {
    this.entries = [];
  }
}
