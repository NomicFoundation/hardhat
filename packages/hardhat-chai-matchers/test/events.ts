import type {
  AnotherContract,
  EventsContract,
  MatchersContract,
} from "./contracts";

import { expect, AssertionError } from "chai";
import { ethers } from "ethers";

import "../src/internal/add-chai-matchers";
import { anyUint, anyValue } from "../src/withArgs";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe(".to.emit (contract events)", () => {
  let contract: EventsContract;
  let otherContract: AnotherContract;
  let matchers: MatchersContract;

  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe.only("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    beforeEach(async function () {
      otherContract = await this.hre.ethers.deployContract("AnotherContract");

      contract = await (
        await this.hre.ethers.getContractFactory<[string], EventsContract>(
          "Events"
        )
      ).deploy(await otherContract.getAddress());

      const Matchers = await this.hre.ethers.getContractFactory<
        [],
        MatchersContract
      >("Matchers");
      matchers = await Matchers.deploy();
    });

    it("Should fail when expecting an event that's not in the contract", async function () {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract'
      );
    });

    it("Should fail when expecting an event that's not in the contract to NOT be emitted", async function () {
      await expect(
        expect(contract.doNotEmit()).not.to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract'
      );
    });

    it("Should detect events without arguments", async function () {
      await expect(contract.emitWithoutArgs())
        .to.emit(contract, "WithoutArgs")
        .withArgs();
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
      it("Should fail when used with .not.", async function () {
        expect(() =>
          expect(contract.emitUint(1))
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("Should fail when used with .not, subject is a rejected promise", async function () {
        expect(() =>
          expect(matchers.revertsWithoutReason())
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async function () {
        expect(() =>
          expect(contract.emitUint(1))
            // @ts-expect-error
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion"
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

      describe("with an address argument", function () {
        const addressable = ethers.Wallet.createRandom();
        const { address } = addressable;
        const otherAddressable = ethers.Wallet.createRandom();
        const { address: otherAddress } = otherAddressable;

        it("Should match the argument", async function () {
          await expect(contract.emitAddress(addressable))
            .to.emit(contract, "WithAddressArg")
            .withArgs(address);
        });

        it("Should match addressable arguments", async function () {
          await expect(contract.emitAddress(addressable))
            .to.emit(contract, "WithAddressArg")
            .withArgs(addressable);
        });

        it("Should fail when the input argument doesn't match the addressable event argument", async function () {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherAddressable)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${address}' to equal '${otherAddress}'`
          );
        });

        it("Should fail when the input argument doesn't match the address event argument", async function () {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherAddress)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${address}' to equal '${otherAddress}'`
          );
        });

        it("Should fail when too many arguments are given", async function () {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(address, otherAddress)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithAddressArg" event to have 2 argument(s), but it has 1'
          );
        });
      });

      const string1 = "string1";
      const string1Bytes = ethers.hexlify(ethers.toUtf8Bytes(string1));
      const string2 = "string2";
      const string2Bytes = ethers.hexlify(ethers.toUtf8Bytes(string2));

      // for abbreviating long strings in diff views like chai does:
      function abbrev(longString: string): string {
        return `${longString.substring(0, 37)}…`;
      }

      function hash(s: string): string {
        return ethers.keccak256(s);
      }

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
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(string2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${hash(
              string2Bytes
            )}. The actual hash and the expected hash did not match: expected '${abbrev(
              hash(string1Bytes)
            )}' to equal '${abbrev(hash(string2Bytes))}'`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(hash(string1Bytes))
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead."
          );
        });

        it("Should fail when trying to match the event argument with an incorrect hash value", async function () {
          const expectedHash = hash(string1Bytes);
          const incorrectHash = hash(string2Bytes);
          await expect(
            expect(contract.emitIndexedString(string1))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(incorrectHash)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${hash(
              incorrectHash
            )}. The actual hash and the expected hash did not match: expected '${abbrev(
              expectedHash
            )}' to equal '${abbrev(hash(incorrectHash))}'`
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
            `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${hash(
              string1Bytes
            )}. The actual hash and the expected hash did not match: expected '${abbrev(
              hash(string2Bytes)
            )}' to equal '${abbrev(hash(string1Bytes))}'`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(
            expect(contract.emitIndexedBytes(string1Bytes))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(hash(string1Bytes))
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead."
          );
        });
      });

      const string1Bytes32 = ethers.zeroPadValue(string1Bytes, 32);
      const string2Bytes32 = ethers.zeroPadValue(string2Bytes, 32);
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
            `expected '${abbrev(
              ethers.hexlify(string2Bytes32)
            )}' to equal '${abbrev(ethers.hexlify(string1Bytes32))}'`
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
            `expected '${abbrev(
              ethers.hexlify(string2Bytes32)
            )}' to equal '${abbrev(ethers.hexlify(string1Bytes32))}'`
          );
        });

        it("Should match the event argument with a hash value", async function () {
          await expect(contract.emitIndexedBytes32(string1Bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(string1Bytes32);
        });
      });

      describe("with a uint array argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.emitUintArray(1, 2))
            .to.emit(contract, "WithUintArray")
            .withArgs([1, 2]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 3"
          );
        });

        it("Should fail when the arrays don't have the same length", async function () {
          await expect(
            expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([1])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected the 1st argument of the "WithUintArray" event to have 1 element, but it has 2'
          );

          await expect(
            expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([1, 2, 3])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected the 1st argument of the "WithUintArray" event to have 3 elements, but it has 2'
          );
        });
      });

      describe("with a bytes32 array argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(
            contract.emitBytes32Array(
              `0x${"aa".repeat(32)}`,
              `0x${"bb".repeat(32)}`
            )
          )
            .to.emit(contract, "WithBytes32Array")
            .withArgs([`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(
              contract.emitBytes32Array(
                `0x${"aa".repeat(32)}`,
                `0x${"bb".repeat(32)}`
              )
            )
              .to.emit(contract, "WithBytes32Array")
              .withArgs([`0x${"cc".repeat(32)}`, `0x${"dd".repeat(32)}`])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${abbrev(`0x${"aa".repeat(32)}`)}' to equal '${abbrev(
              `0x${"cc".repeat(32)}`
            )}'`
          );
        });
      });

      describe("with a struct argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.emitStruct(1, 2))
            .to.emit(contract, "WithStructArg")
            .withArgs([1, 2]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.emitStruct(1, 2))
              .to.emit(contract, "WithStructArg")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 3"
          );
        });
      });

      describe("with multiple arguments", function () {
        it("Should successfully match the arguments", async function () {
          await expect(contract.emitTwoUints(1, 2))
            .to.emit(contract, "WithTwoUintArgs")
            .withArgs(1, 2);
        });

        it("Should fail when the first argument isn't matched", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(2, 2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 1 to equal 2"
          );
        });

        it("Should fail when the second argument isn't matched", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "expected 2 to equal 1"
          );
        });

        it("Should fail when too many arguments are supplied", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 2, 3, 4)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithTwoUintArgs" event to have 4 argument(s), but it has 2'
          );
        });

        it("Should fail when too few arguments are supplied", async function () {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected "WithTwoUintArgs" event to have 1 argument(s), but it has 2'
          );
        });

        describe("Should handle argument predicates", function () {
          it("Should pass when a predicate argument returns true", async function () {
            await expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(anyValue, anyUint);
          });

          it("Should fail when a predicate argument returns false", async function () {
            await expect(
              expect(contract.emitTwoUints(1, 2))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1, () => false)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "The predicate for the 2nd event argument did not return true"
            );
          });

          it("Should fail when a predicate argument throws an error", async function () {
            await expect(
              expect(contract.emitTwoUints(1, 2))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(() => {
                  throw new Error("user-defined error");
                }, "foo")
            ).to.be.rejectedWith(Error, "user-defined error");
          });

          describe("with predicate anyUint", function () {
            it("Should fail when the event argument is a string", async function () {
              await expect(
                expect(contract.emitString("a string"))
                  .to.emit(contract, "WithStringArg")
                  .withArgs(anyUint)
              ).to.be.rejectedWith(
                AssertionError,
                "The predicate for the 1st event argument threw when called: anyUint expected its argument to be an integer, but its type was 'string'"
              );
            });

            it("Should fail when the event argument is negative", async function () {
              await expect(
                expect(contract.emitInt(-1))
                  .to.emit(contract, "WithIntArg")
                  .withArgs(anyUint)
              ).to.be.rejectedWith(
                AssertionError,
                "The predicate for the 1st event argument threw when called: anyUint expected its argument to be an unsigned integer, but it was negative, with value -1"
              );
            });
          });
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
        it("Should succeed when the expected event is emitted and the unexpected event is not", async function () {
          await expect(contract.emitWithoutArgs())
            .to.emit(contract, "WithoutArgs")
            .and.not.to.emit(otherContract, "WithUintArg");
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
          it("Should fail when the second expected event is emitted but the first is not", async function () {
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
        describe("When specifying .withArgs()", async function () {
          it("Should pass when expecting the correct args from the first event", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg");
          });
          it("Should pass when expecting the correct args from the second event", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });
          it("Should pass when expecting the correct args from both events", async function () {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });
          it("Should fail when expecting the wrong argument value for the first event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "expected 1 to equal 2"
            );
          });
          it("Should fail when expecting the wrong argument value for the second event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "expected 'a string' to equal 'a different string'"
            );
          });
          it("Should fail when expecting too many arguments from the first event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(1, 2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithUintArg" event to have 2 argument(s), but it has 1'
            );
          });
          it("Should fail when expecting too many arguments from the second event", async function () {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string", "yet another string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithStringArg" event to have 2 argument(s), but it has 1'
            );
          });
          it("Should fail when expecting too few arguments from the first event", async function () {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string"
                )
              )
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1)
                .and.to.emit(contract, "WithTwoStringArgs")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithTwoUintArgs" event to have 1 argument(s), but it has 2'
            );
          });
          it("Should fail when expecting too few arguments from the second event", async function () {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string"
                )
              )
                .to.emit(contract, "WithTwoUintArgs")
                .and.to.emit(contract, "WithTwoStringArgs")
                .withArgs("a string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected "WithTwoStringArgs" event to have 1 argument(s), but it has 2'
            );
          });
        });

        describe("With a contract that emits the same event twice but with different arguments", function () {
          it("Should pass when expectations are met", async function () {
            await expect(contract.emitUintTwice(1, 2))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithUintArg")
              .withArgs(2);
          });

          it("Should fail when the first event's argument is not matched", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(3)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(2)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events'
            );
          });

          it("Should fail when the second event's argument is not matched", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(1)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(3)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events'
            );
          });

          it("Should fail when none of the emitted events match the given argument", async function () {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(3)
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events'
            );
          });
        });
      });
    });

    describe("When nested events are emitted", function () {
      describe("With the nested event emitted from the same contract", function () {
        it("Should pass when the expected event is emitted", async function () {
          await expect(contract.emitNestedUintFromSameContract(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the expected event is not emitted", async function () {
          await expect(
            expect(contract.emitNestedUintFromSameContract(1)).to.emit(
              contract,
              "WithStringArg"
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithStringArg" to be emitted, but it wasn\'t'
          );
        });
      });

      describe("With the nested event emitted from a different contract", function () {
        it("Should pass when the expected event is emitted", async function () {
          await expect(contract.emitNestedUintFromAnotherContract(1))
            .to.emit(otherContract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the expected event is emitted but not by the contract that was passed", async function () {
          await expect(
            expect(contract.emitNestedUintFromAnotherContract(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithUintArg" to be emitted, but it wasn\'t'
          );
        });
      });
    });

    it("With executed transaction", async () => {
      const tx = await contract.emitWithoutArgs();
      await expect(tx).to.emit(contract, "WithoutArgs");
    });

    it("With transaction hash", async () => {
      const tx = await contract.emitWithoutArgs();
      await expect(tx.hash).to.emit(contract, "WithoutArgs");
    });
  }
});
