import type {
  AnotherContract,
  EventsContract,
  MatchersContract,
  OverrideEventContract,
} from "../helpers/contracts.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";

import { before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { expect, AssertionError } from "chai";
import { id } from "ethers/hash";
import { hexlify, toUtf8Bytes, zeroPadValue } from "ethers/utils";
import { Wallet } from "ethers/wallet";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";
import { anyUint, anyValue } from "../../src/withArgs.js";
import { initEnvironment, useTmpFixtureProject } from "../helpers/helpers.js";

addChaiMatchers();

describe(".to.emit (contract events)", { timeout: 60000 }, () => {
  let contract: EventsContract;
  let otherContract: AnotherContract;
  let overrideEventContract: OverrideEventContract;
  let matchers: MatchersContract;

  describe("with the in-process hardhat network", () => {
    useTmpFixtureProject("hardhat-project");
    runTests();
  });

  function runTests() {
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers } = await initEnvironment("events"));
    });

    beforeEach(async () => {
      otherContract = await ethers.deployContract("AnotherContract");

      contract = await (
        await ethers.getContractFactory<[string], EventsContract>("Events")
      ).deploy(await otherContract.getAddress());

      overrideEventContract = await (
        await ethers.getContractFactory<[], OverrideEventContract>(
          "OverrideEventContract",
        )
      ).deploy();

      const Matchers = await ethers.getContractFactory<[], MatchersContract>(
        "Matchers",
      );
      matchers = await Matchers.deploy();
    });

    it("should fail when expecting an event that's not in the contract", async () => {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "NonexistentEvent"),
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract',
      );
    });

    it("should fail when expecting an event that's not in the contract to NOT be emitted", async () => {
      await expect(
        expect(contract.doNotEmit()).not.to.emit(contract, "NonexistentEvent"),
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract',
      );
    });

    it("should fail when matcher is called with too many arguments", async () => {
      await assertRejectsWithHardhatError(
        () =>
          // @ts-expect-error -- force error scenario: emit should not be called with more than two arguments
          expect(contract.emitUint(1)).not.to.emit(contract, "WithoutArgs", 1),
        HardhatError.ERRORS.CHAI_MATCHERS.EMIT_EXPECTS_TWO_ARGUMENTS,
        {},
      );
    });

    it("should detect events without arguments", async () => {
      await expect(contract.emitWithoutArgs()).to.emit(contract, "WithoutArgs");
    });

    it("should fail when expecting an event that wasn't emitted", async () => {
      await expect(
        expect(contract.doNotEmit()).to.emit(contract, "WithoutArgs"),
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" to be emitted, but it wasn\'t',
      );
    });

    it("should fail when expecting a specific event NOT to be emitted but it WAS", async () => {
      await expect(
        expect(contract.emitWithoutArgs()).to.not.emit(contract, "WithoutArgs"),
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" NOT to be emitted, but it was',
      );
    });

    describe(".withArgs", () => {
      it("should fail when used with .not.", async () => {
        expect(() =>
          expect(contract.emitUint(1))
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1),
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail when used with .not, subject is a rejected promise", async () => {
        expect(() =>
          expect(matchers.revertsWithoutReason())
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1),
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async () => {
        expect(() =>
          expect(contract.emitUint(1))
            // @ts-expect-error -- force "withArgs" to be called on its own
            .withArgs(1),
        ).to.throw(
          Error,
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion",
        );
      });

      it("should verify zero arguments", async () => {
        await expect(contract.emitWithoutArgs())
          .to.emit(contract, "WithoutArgs")
          .withArgs();
      });

      describe("with a uint argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitUint(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(2),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithUintArg" event: Error in the 1st argument assertion: expected 1 to equal 2.',
          );
        });

        it("should fail when too many arguments are given", async () => {
          await expect(
            expect(contract.emitUint(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(1, 3),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithUintArg" event: Expected arguments array to have length 2, but it has 1',
          );
        });
      });

      describe("with an address argument", () => {
        const addressable = Wallet.createRandom();
        const { address } = addressable;
        const otherAddressable = Wallet.createRandom();
        const { address: otherAddress } = otherAddressable;

        it("should match the argument", async () => {
          await expect(contract.emitAddress(addressable))
            .to.emit(contract, "WithAddressArg")
            .withArgs(address);
        });

        it("should match addressable arguments", async () => {
          await expect(contract.emitAddress(addressable))
            .to.emit(contract, "WithAddressArg")
            .withArgs(addressable);
        });

        it("should fail when the input argument doesn't match the addressable event argument", async () => {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherAddressable),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithAddressArg" event: Error in the 1st argument assertion: expected '${address}' to equal '${otherAddress}'`,
          );
        });

        it("should fail when the input argument doesn't match the address event argument", async () => {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherAddress),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithAddressArg" event: Error in the 1st argument assertion: expected '${address}' to equal '${otherAddress}'`,
          );
        });

        it("should fail when too many arguments are given", async () => {
          await expect(
            expect(contract.emitAddress(addressable))
              .to.emit(contract, "WithAddressArg")
              .withArgs(address, otherAddress),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithAddressArg" event: Expected arguments array to have length 2, but it has 1',
          );
        });
      });

      // for abbreviating long strings in diff views like chai does:
      function abbrev(longString: string): string {
        return `${longString.substring(0, 37)}…`;
      }

      function formatHash(str: string, hashFn = id) {
        const hash = hashFn(str);
        return {
          str,
          hash,
          abbrev: abbrev(hash),
        };
      }

      function formatBytes(str: string) {
        const bytes = hexlify(toUtf8Bytes(str));
        const bytes32 = zeroPadValue(bytes, 32);
        return {
          ...formatHash(str),
          bytes,
          bytes32,
          abbrev32: abbrev(hexlify(bytes32)),
        };
      }

      const str1 = formatBytes("string1");
      const str2 = formatBytes("string2");

      describe("with a string argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitString("string"))
            .to.emit(contract, "WithStringArg")
            .withArgs("string");
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitString(str1.str))
              .to.emit(contract, "WithStringArg")
              .withArgs(str2.str),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${str1.str}' to equal '${str2.str}'`,
          );
        });
      });

      describe("with an indexed string argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitIndexedString(str1.str))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(str1.str);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitIndexedString(str1.str))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(str2.str),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedStringArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${str2.hash}. The actual hash and the expected hash ${str1.hash} did not match: expected '${str1.abbrev}' to equal '${str2.abbrev}'`,
          );
        });

        it("should fail if expected argument is the hash not the pre-image", async () => {
          await expect(
            expect(contract.emitIndexedString(str1.str))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(str1.hash),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead",
          );
        });

        it("should fail when trying to match the event argument with an incorrect hash value", async () => {
          const incorrect = formatHash(str2.hash, ethers.keccak256);
          await expect(
            expect(contract.emitIndexedString(str1.str))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(incorrect.str),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedStringArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${incorrect.hash}. The actual hash and the expected hash ${str1.hash} did not match: expected '${str1.abbrev}' to equal '${incorrect.abbrev}`,
          );
        });
      });

      describe("with a bytes argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitBytes(str1.bytes))
            .to.emit(contract, "WithBytesArg")
            .withArgs(str1.bytes);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitBytes(str2.bytes))
              .to.emit(contract, "WithBytesArg")
              .withArgs(str1.str),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytesArg" event: Error in the 1st argument assertion: expected '${str2.bytes}' to equal '${str1.str}'`,
          );
        });
      });

      describe("with an indexed bytes argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitIndexedBytes(str1.bytes))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(str1.str);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitIndexedBytes(str2.bytes))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(str1.str),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedBytesArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${str1.hash}. The actual hash and the expected hash ${str2.hash} did not match: expected '${str2.abbrev}' to equal '${str1.abbrev}'`,
          );
        });

        it("should fail the passerd argument is the hash, not the pre-image", async () => {
          await expect(
            expect(contract.emitIndexedBytes(str1.bytes))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(str1.hash),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead.",
          );
        });
      });

      describe("with a bytes32 argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitBytes32(str1.bytes32))
            .to.emit(contract, "WithBytes32Arg")
            .withArgs(str1.bytes32);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitBytes32(str2.bytes32))
              .to.emit(contract, "WithBytes32Arg")
              .withArgs(str1.bytes32),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytes32Arg" event: Error in the 1st argument assertion: expected '${str2.abbrev32}' to equal '${str1.abbrev32}'`,
          );
        });
      });

      describe("with an indexed bytes32 argument", () => {
        it("should match the argument", async () => {
          await expect(contract.emitIndexedBytes32(str1.bytes32))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(str1.bytes32);
        });

        it("should fail when the input argument doesn't match the event argument", async () => {
          await expect(
            expect(contract.emitIndexedBytes32(str2.bytes32))
              .to.emit(contract, "WithIndexedBytes32Arg")
              .withArgs(str1.bytes32),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedBytes32Arg" event: Error in the 1st argument assertion: expected '${str2.abbrev32}' to equal '${str1.abbrev32}'`,
          );
        });
      });

      describe("with a uint array argument", () => {
        it("should succeed when expectations are met", async () => {
          await expect(contract.emitUintArray(1, 2))
            .to.emit(contract, "WithUintArray")
            .withArgs([1, 2]);
        });

        it("should fail when expectations are not met", async () => {
          await expect(
            expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([3, 4]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.`,
          );
        });

        describe("nested predicate", () => {
          it("should succeed when predicate passes", async () => {
            await expect(contract.emitUintArray(1, 2))
              .to.emit(contract, "WithUintArray")
              .withArgs([anyValue, 2]);
          });

          it("should fail when predicate returns false", async () => {
            await expect(
              expect(contract.emitUintArray(1, 2))
                .to.emit(contract, "WithUintArray")
                .withArgs([() => false, 4]),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: The predicate did not return true`,
            );
          });

          it("should fail when predicate reverts", async () => {
            await expect(
              expect(contract.emitUintArray(1, 2))
                .to.emit(contract, "WithUintArray")
                .withArgs([
                  () => {
                    throw new Error("user error");
                  },
                  4,
                ]),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: The predicate threw when called: user error`,
            );
          });
        });

        describe("arrays different length", () => {
          it("should fail when the array is shorter", async () => {
            await expect(
              expect(contract.emitUintArray(1, 2))
                .to.emit(contract, "WithUintArray")
                .withArgs([1]),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArray" event: Error in the 1st argument assertion: Expected arguments array to have length 1, but it has 2',
            );
          });

          it("should fail when the array is longer", async () => {
            await expect(
              expect(contract.emitUintArray(1, 2))
                .to.emit(contract, "WithUintArray")
                .withArgs([1, 2, 3]),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArray" event: Error in the 1st argument assertion: Expected arguments array to have length 3, but it has 2',
            );
          });
        });
      });

      describe("with a bytes32 array argument", () => {
        const aa = `0x${"aa".repeat(32)}`;
        const bb = `0x${"bb".repeat(32)}`;
        const cc = `0x${"cc".repeat(32)}`;
        const dd = `0x${"dd".repeat(32)}`;

        it("should succeed when expectations are met", async () => {
          await expect(contract.emitBytes32Array(aa, bb))
            .to.emit(contract, "WithBytes32Array")
            .withArgs([aa, bb]);
        });

        it("should fail when expectations are not met", async () => {
          await expect(
            expect(contract.emitBytes32Array(aa, bb))
              .to.emit(contract, "WithBytes32Array")
              .withArgs([cc, dd]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytes32Array" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected '${abbrev(
              aa,
            )}' to equal '${abbrev(cc)}'`,
          );
        });
      });

      describe("with a struct argument", () => {
        it("should succeed when expectations are met", async () => {
          await expect(contract.emitStruct(1, 2))
            .to.emit(contract, "WithStructArg")
            .withArgs([1, 2]);
        });

        it("should fail when expectations are not met", async () => {
          await expect(
            expect(contract.emitStruct(1, 2))
              .to.emit(contract, "WithStructArg")
              .withArgs([3, 4]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithStructArg" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.',
          );
        });
      });

      describe("with multiple arguments", () => {
        it("should successfully match the arguments", async () => {
          await expect(contract.emitTwoUints(1, 2))
            .to.emit(contract, "WithTwoUintArgs")
            .withArgs(1, 2);
        });

        it("should fail when the first argument isn't matched", async () => {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(2, 2),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Error in the 1st argument assertion: expected 1 to equal 2',
          );
        });

        it("should fail when the second argument isn't matched", async () => {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 1),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Error in the 2nd argument assertion: expected 2 to equal 1.',
          );
        });

        it("should fail when too many arguments are supplied", async () => {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 2, 3, 4),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Expected arguments array to have length 4, but it has 2',
          );
        });

        it("should fail when too few arguments are supplied", async () => {
          await expect(
            expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Expected arguments array to have length 1, but it has 2',
          );
        });

        describe("should handle argument predicates", () => {
          it("should pass when a predicate argument returns true", async () => {
            await expect(contract.emitTwoUints(1, 2))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(anyValue, anyUint);
          });

          it("should fail when a predicate argument returns false", async () => {
            await expect(
              expect(contract.emitTwoUints(1, 2))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1, () => false),
            ).to.be.rejectedWith(
              AssertionError,
              'Error in "WithTwoUintArgs" event: Error in the 2nd argument assertion: The predicate did not return true',
            );
          });

          it("should fail when a predicate argument throws an error", async () => {
            await expect(
              expect(contract.emitTwoUints(1, 2))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(() => {
                  throw new Error("user-defined error");
                }, "foo"),
            ).to.be.rejectedWith(
              Error,
              'Error in "WithTwoUintArgs" event: Error in the 1st argument assertion: The predicate threw when called: user-defined error',
            );
          });

          describe("with predicate anyUint", () => {
            it("should fail when the event argument is a string", async () => {
              await expect(
                expect(contract.emitString("a string"))
                  .to.emit(contract, "WithStringArg")
                  .withArgs(anyUint),
              ).to.be.rejectedWith(
                AssertionError,
                "Error in \"WithStringArg\" event: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an integer, but its type was 'string'",
              );
            });

            it("should fail when the event argument is negative", async () => {
              await expect(
                expect(contract.emitInt(-1))
                  .to.emit(contract, "WithIntArg")
                  .withArgs(anyUint),
              ).to.be.rejectedWith(
                AssertionError,
                'Error in "WithIntArg" event: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an unsigned integer, but it was negative, with value -1',
              );
            });
          });
        });
      });
    });

    describe("With one call that emits two separate events", () => {
      it("should successfully catch each event independently", async () => {
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithUintArg",
        );
        await expect(contract.emitUintAndString(1, "a string")).to.emit(
          contract,
          "WithStringArg",
        );
      });

      describe("When detecting two events from one call (chaining)", () => {
        it("should succeed when both expected events are indeed emitted", async () => {
          await expect(contract.emitUintAndString(1, "a string"))
            .to.emit(contract, "WithUintArg")
            .and.to.emit(contract, "WithStringArg");
        });

        it("should succeed when the expected event is emitted and the unexpected event is not", async () => {
          await expect(contract.emitWithoutArgs())
            .to.emit(contract, "WithoutArgs")
            .and.not.to.emit(otherContract, "WithUintArg");
        });

        describe("When one of the expected events is emitted and the other is not", () => {
          it("should fail when the first expected event is emitted but the second is not", async () => {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t',
            );
          });

          it("should fail when the second expected event is emitted but the first is not", async () => {
            await expect(
              expect(contract.emitUint(1))
                .to.emit(contract, "WithStringArg")
                .and.to.emit(contract, "WithUintArg"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t',
            );
          });
        });

        describe("When specifying .withArgs()", () => {
          it("should pass when expecting the correct args from the first event", async () => {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg");
          });

          it("should pass when expecting the correct args from the second event", async () => {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });

          it("should pass when expecting the correct args from both events", async () => {
            await expect(contract.emitUintAndString(1, "a string"))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });

          it("should fail when expecting the wrong argument value for the first event", async () => {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(2)
                .and.to.emit(contract, "WithStringArg"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArg" event: Error in the 1st argument assertion: expected 1 to equal 2.',
            );
          });

          it("should fail when expecting the wrong argument value for the second event", async () => {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "Error in \"WithStringArg\" event: Error in the 1st argument assertion: expected 'a string' to equal 'a different string'",
            );
          });

          it("should fail when expecting too many arguments from the first event", async () => {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .withArgs(1, 2)
                .and.to.emit(contract, "WithStringArg"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArg" event: Expected arguments array to have length 2, but it has 1',
            );
          });

          it("should fail when expecting too many arguments from the second event", async () => {
            await expect(
              expect(contract.emitUintAndString(1, "a string"))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string", "yet another string"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithStringArg" event: Expected arguments array to have length 2, but it has 1',
            );
          });

          it("should fail when expecting too few arguments from the first event", async () => {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string",
                ),
              )
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1)
                .and.to.emit(contract, "WithTwoStringArgs"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithTwoUintArgs" event: Expected arguments array to have length 1, but it has 2',
            );
          });

          it("should fail when expecting too few arguments from the second event", async () => {
            await expect(
              expect(
                contract.emitTwoUintsAndTwoStrings(
                  1,
                  2,
                  "a string",
                  "another string",
                ),
              )
                .to.emit(contract, "WithTwoUintArgs")
                .and.to.emit(contract, "WithTwoStringArgs")
                .withArgs("a string"),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithTwoStringArgs" event: Expected arguments array to have length 1, but it has 2',
            );
          });
        });

        describe("With a contract that emits the same event twice but with different arguments", () => {
          it("should pass when expectations are met", async () => {
            await expect(contract.emitUintTwice(1, 2))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithUintArg")
              .withArgs(2);
          });

          it("should fail when the first event's argument is not matched", async () => {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(3)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(2),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events',
            );
          });

          it("should fail when the second event's argument is not matched", async () => {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(1)
                .and.to.emit(contract, "WithUintArg")
                .withArgs(3),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events',
            );
          });

          it("should fail when none of the emitted events match the given argument", async () => {
            await expect(
              expect(contract.emitUintTwice(1, 2))
                .to.emit(contract, "WithUintArg")
                .withArgs(3),
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'The specified arguments ([ 3 ]) were not included in any of the 2 emitted "WithUintArg" events',
            );
          });
        });
      });
    });

    describe("When nested events are emitted", () => {
      describe("With the nested event emitted from the same contract", () => {
        it("should pass when the expected event is emitted", async () => {
          await expect(contract.emitNestedUintFromSameContract(1))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("should fail when the expected event is not emitted", async () => {
          await expect(
            expect(contract.emitNestedUintFromSameContract(1)).to.emit(
              contract,
              "WithStringArg",
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithStringArg" to be emitted, but it wasn\'t',
          );
        });
      });

      describe("With the nested event emitted from a different contract", () => {
        it("should pass when the expected event is emitted", async () => {
          await expect(contract.emitNestedUintFromAnotherContract(1))
            .to.emit(otherContract, "WithUintArg")
            .withArgs(1);
        });

        it("should fail when the expected event is emitted but not by the contract that was passed", async () => {
          await expect(
            expect(contract.emitNestedUintFromAnotherContract(1))
              .to.emit(contract, "WithUintArg")
              .withArgs(1),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Expected event "WithUintArg" to be emitted, but it wasn\'t',
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

    describe("When event is overloaded", () => {
      it("should fail when the event name is ambiguous", async () => {
        await expect(
          expect(overrideEventContract.emitSimpleEventWithUintArg(1n)).to.emit(
            overrideEventContract,
            "simpleEvent",
          ),
        ).to.be.eventually.rejectedWith(
          AssertionError,
          `ambiguous event description (i.e. matches "simpleEvent(uint256)", "simpleEvent()")`,
        );
      });

      it("should pass when the event name is not ambiguous", async () => {
        await expect(overrideEventContract.emitSimpleEventWithUintArg(1n))
          .to.emit(overrideEventContract, "simpleEvent(uint256)")
          .withArgs(1);
        await expect(overrideEventContract.emitSimpleEventWithoutArg()).to.emit(
          overrideEventContract,
          "simpleEvent()",
        );
      });
    });
  }
});
