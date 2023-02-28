const { expect } = require("chai");
const { ethers } = require("ethers");

const Multisig = require("../ignition/MultisigModule");

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

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

      const artifact = await hre.artifacts.readArtifact("Multisig");
      const multisigInstance = await hre.ethers.getContractAt(
        artifact.abi,
        "0x5FbDB2315678afecb367f032d93F642f64180aa3"
      );
      await multisigInstance.confirmTransaction(0);

      const moduleResult = await ignition.deploy(Multisig, {
        journal,
      });

      multisig = moduleResult.multisig;
    });

    it("should confirm a stored transaction", async function () {
      const [isConfirmed] = await multisig.functions.confirmations(
        0,
        ACCOUNT_0
      );

      expect(isConfirmed).to.equal(true);
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
