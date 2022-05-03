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

    it("Should detect events without arguments", async function () {
      await expect(contract.emitWithoutArgs()).to.emit(contract, "WithoutArgs");
    });

    it("Should fail when expecting an event that wasn't emitted", async function () {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "WithoutArgs")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" to be emitted, but it wasn\'t'
      );
    });

    it("Should fail when expecting a specific event NOT to be emitted but it WAS", async function () {
      await expect(
        expect(contract.emitWithoutArgs()).to.not.emit(contract, "WithoutArgs")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" NOT to be emitted, but it was'
      );
    });

    describe(".withArgs", function () {
      it.skip("Should fail when used with .not.", async function () {
        await expect(
          expect(contract.emitUint(1))
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.be.eventually.rejectedWith(
          AssertionError,
          "Do not combine .not. with .withArgs()"
        );
      });

      describe("with a uint argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitUint(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 2"
          );
        });

        it("Should fail when too many arguments are given", async function () {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(1, 3)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithUintArg" event to have 2 argument(s), but it has 1'
          );
        });
      });

      const string1 = "string1";
      const string1Bytes = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(string1)
      );
      const string2 = "string2";
      const string2Bytes = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(string2)
      );

      describe("with a string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitString("string"))
            .to.emit(contract, "WithStringArg")
            .withArgs("string");
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitString(string1))
              .to.emit(contract, "WithStringArg")
              .withArgs(string2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${string1}' to equal '${string2}'`
          );
        });
      });

      describe("with an indexed string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedString(string1))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(string1);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          // this error message is terrible. should improve the implementation.
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(string2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.keccak256(
              string1Bytes
            )}' to be one of [ Array(2) ]`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedString(string1))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(ethers.utils.keccak256(string1Bytes));
        });

        it("Should fail when trying to match the event argument with an incorrect hash value", async function () {
          const expectedHash = ethers.utils.keccak256(string1Bytes);
          const incorrectHash = ethers.utils.keccak256(string2Bytes);
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(incorrectHash)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${expectedHash}' to be one of [ Array(2) ]`
          );
        });
      });

      describe("with a bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitBytes(string1Bytes))
            .to.emit(contract, "WithBytesArg")
            .withArgs(string1Bytes);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitBytes(string2Bytes))
              .to.emit(contract, "WithBytesArg")
              .withArgs(string1Bytes)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${string2Bytes}' to equal '${string1Bytes}'`
          );
        });
      });

      describe("with an indexed bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedBytes(string1Bytes))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(string1Bytes);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitIndexedBytes(string2Bytes))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(string1Bytes)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.keccak256(
              string2Bytes
            )}' to be one of [ Array(2) ]`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedBytes(string1Bytes))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(ethers.utils.keccak256(string1Bytes));
        });
      });

      const string1Bytes32 = ethers.utils.zeroPad(string1Bytes, 32);
      const string2Bytes32 = ethers.utils.zeroPad(string2Bytes, 32);
      describe("with a bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitBytes32(string1Bytes32))
            .to.emit(contract, "WithBytes32Arg")
            .withArgs(string1Bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitBytes32(string2Bytes32))
              .to.emit(contract, "WithBytes32Arg")
              .withArgs(string1Bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.hexlify(
              string2Bytes32
            )}' to equal '${ethers.utils.hexlify(string1Bytes32)}'`
          );
        });
      });

      describe("with an indexed bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.emitIndexedBytes32(string1Bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(string1Bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.emitIndexedBytes32(string2Bytes32))
              .to.emit(contract, "WithIndexedBytes32Arg")
              .withArgs(string1Bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${ethers.utils.hexlify(
              string2Bytes32
            )}' to equal '${ethers.utils.hexlify(string1Bytes32)}'`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedBytes32(string1Bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(string1Bytes32);
        });
      });
    });

    describe("With one call that emits two separate events", function () {
      it("Should successfully catch each event independently", async function () {
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithUintArg"
        );
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithStringArg"
        );
      });
      describe("When detecting two events from one call (chaining)", async function () {
        it("Should succeed when both expected events are indeed emitted", async function () {
          await expect(contract.emitUintAndString(1, "a string"))
            .to.emit(contract, "WithUintArg")
            .and.to.emit(contract, "WithStringArg");
        });
        describe("When one of the expected events is emitted and the other is not", function () {
          it("Should fail when the first expected event is emitted but the second is not", async function () {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
          it.skip("Should fail when the second expected event is emitted but the first is not", async function () {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithStringArg")
                .and.to.emit(contract, "WithUintArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
        });
      });
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
