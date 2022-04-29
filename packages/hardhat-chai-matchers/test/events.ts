import { expect, AssertionError } from "chai";
import { BigNumber, Contract, ContractFactory, ethers } from "ethers";

import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe(".to.emit (contract events)", () => {
  let factory: ContractFactory;
  let contract: Contract;

  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    beforeEach(async function () {
      contract = await (
        await this.hre.ethers.getContractFactory("Events")
      ).deploy();
    });

    it("Should fail when expecting an event that's not in the contract", async function () {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "Expected event \"NonexistentEvent\" to be emitted, but it doesn't exist in the contract. Please make sure you've compiled its latest version before running the test."
      );
    });

    it("Should fail when expecting an event that's not in the contract to NOT be emitted", async function () {
      await expect(
        expect(contract.doNotEmit()).not.to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "WARNING: Expected event \"NonexistentEvent\" NOT to be emitted. The event wasn't emitted because it doesn't exist in the contract. Please make sure you've compiled its latest version before running the test."
      );
    });

    it.skip("Does fail with a terrible error message when expecting an event from a pure function", async function () {
      await expect(contract.doNotEmitPure()).not.to.emit(
        contract,
        "NonexistentEvent"
      );
    });

    it("Emit one: success", async () => {
      await expect(contract.emitOne()).to.emit(contract, "One");
    });

    it("Emit one: fail", async () => {
      await expect(
        expect(contract.emitOne()).to.emit(contract, "Two")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "Two" to be emitted, but it wasn\'t'
      );
    });

    it("Emit two: success", async () => {
      await expect(contract.emitTwo())
        .to.emit(contract, "Two")
        .withArgs(2, "Two");
    });

    it("Emit two: fail", async () => {
      await expect(
        expect(contract.emitTwo()).to.emit(contract, "One")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "One" to be emitted, but it wasn\'t'
      );
    });

    it("Emit index: success", async () => {
      const bytes = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("Three"));
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Three"));
      await expect(contract.emitIndex())
        .to.emit(contract, "Index")
        .withArgs(
          hash,
          "Three",
          bytes,
          hash,
          "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
        );
      await expect(contract.emitIndex())
        .to.emit(contract, "Index")
        .withArgs(
          "Three",
          "Three",
          bytes,
          bytes,
          "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
        );
    });

    it("Do not emit one: fail", async () => {
      await expect(
        expect(contract.emitOne()).to.not.emit(contract, "One")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "One" NOT to be emitted, but it was'
      );
    });

    it("Do not emit two: success", async () => {
      await expect(contract.emitTwo()).to.not.emit(contract, "One");
    });

    it("Emit both: success (two expects)", async () => {
      await expect(contract.emitBoth())
        .to.emit(contract, "One")
        .withArgs(
          1,
          "One",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
      await expect(contract.emitBoth()).to.emit(contract, "Two");
    });

    it('Emit both: success (one expect with two "to" prepositions)', async () => {
      await expect(contract.emitBoth())
        .to.emit(contract, "One")
        .withArgs(
          1,
          "One",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        )
        .and.to.emit(contract, "Two");
    });

    it("Event with proper args", async () => {
      await expect(contract.emitOne())
        .to.emit(contract, "One")
        .withArgs(
          1,
          "One",
          "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
        );
    });

    it("Event with proper args from nested", async () => {
      await expect(contract.emitNested())
        .to.emit(contract, "One")
        .withArgs(
          1,
          "One",
          "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
        );
    });

    it("Event with not enough args", async () => {
      await expect(
        expect(contract.emitOne()).to.emit(contract, "One").withArgs(1)
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected "One" event to have 1 argument(s), but it has 3'
      );
    });

    it("Event with too many args", async () => {
      await expect(
        expect(contract.emitOne()).to.emit(contract, "One").withArgs(1, 2, 3, 4)
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected "One" event to have 4 argument(s), but it has 3'
      );
    });

    it("Event with one different arg (integer)", async () => {
      await expect(
        expect(contract.emitOne())
          .to.emit(contract, "One")
          .withArgs(
            2,
            "One",
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
          )
      ).to.be.eventually.rejectedWith(AssertionError, "expected 1 to equal 2");
    });

    it("Event with one different arg (string)", async () => {
      await expect(
        expect(contract.emitOne())
          .to.emit(contract, "One")
          .withArgs(
            1,
            "Two",
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
          )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "expected 'One' to equal 'Two'"
      );
    });

    it("Event with one different arg (string) #2", async () => {
      await expect(
        expect(contract.emitOne())
          .to.emit(contract, "One")
          .withArgs(
            1,
            "One",
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124"
          )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "expected '0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123' " +
          "to equal '0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124'"
      );
    });

    it("Event with array of BigNumbers and bytes32 types", async () => {
      await expect(contract.emitArrays())
        .to.emit(contract, "Arrays")
        .withArgs(
          [1, 2, 3],
          [
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123",
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124",
          ]
        );
    });

    it("Event with array of BigNumbers providing bignumbers to the matcher", async () => {
      await expect(contract.emitArrays())
        .to.emit(contract, "Arrays")
        .withArgs(
          [BigNumber.from(1), 2, BigNumber.from(3)],
          [
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123",
            "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124",
          ]
        );
    });

    it("Event with one different arg within array (bytes32)", async () => {
      await expect(
        expect(contract.emitArrays())
          .to.emit(contract, "Arrays")
          .withArgs(
            [BigNumber.from(1), 2, BigNumber.from(3)],
            [
              "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162121",
              "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124",
            ]
          )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        "expected '0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123' " +
          "to equal '0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162121'"
      );
    });

    it("Event with one different arg within array (BigNumber)", async () => {
      await expect(
        expect(contract.emitArrays())
          .to.emit(contract, "Arrays")
          .withArgs(
            [0, 2, 3],
            [
              "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123",
              "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162124",
            ]
          )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        // eslint-disable-next-line no-useless-escape
        "expected 1 to equal 0"
      );
    });

    it.skip("Event emitted in one contract but not in the other", async () => {
      const differentEvents = await factory.deploy();
      await expect(contract.emitOne())
        .to.emit(contract, "One")
        .and.not.to.emit(differentEvents, "One");
    });

    it("Emit event multiple times with different args", async () => {
      await expect(contract.emitOneMultipleTimes())
        .to.emit(contract, "One")
        .withArgs(
          1,
          "One",
          "0x00cfbbaf7ddb3a1476767101c12a0162e241fbad2a0162e2410cfbbaf7162123"
        )
        .and.to.emit(contract, "One")
        .withArgs(
          1,
          "DifferentKindOfOne",
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
    });

    it("Event args not found among multiple emitted events", async () => {
      await expect(
        expect(contract.emitOneMultipleTimes())
          .to.emit(contract, "One")
          .withArgs(1, 2, 3, 4)
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Specified args not emitted in any of 3 emitted "One" events'
      );
    });

    it("With executed transaction", async () => {
      const tx = await contract.emitOne();
      await expect(tx).to.emit(contract, "One");
    });

    it("With transaction hash", async () => {
      const tx = await contract.emitOne();
      await expect(tx.hash).to.emit(contract, "One");
    });
  }
});
