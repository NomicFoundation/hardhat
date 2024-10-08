import type {
  AnotherContract,
  EventsContract,
  MatchersContract,
} from "./contracts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  custom,
  keccak256,
  toHex,
  stringToBytes,
  pad,
} from "viem";
import { expect, AssertionError } from "chai";

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

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    beforeEach(async function () {
      // Contract artifacts don't exist until tests are run.
      // Without artifacts, ts doesn't know contract types.
      // So build fails which prevents tests from being run.
      // '[contract] as unknown as [Contract]' is a bandaid.
      otherContract = (await this.hre.viem.deployContract(
        "AnotherContract"
      )) as unknown as AnotherContract;

      contract = (await this.hre.viem.deployContract("Events", [
        otherContract.address,
      ])) as unknown as EventsContract;

      matchers = (await this.hre.viem.deployContract(
        "Matchers"
      )) as unknown as MatchersContract;
    });

    it("Should fail when expecting an event that's not in the contract", async function () {
      await expect(
        expect(contract.write.doNotEmit()).to.emit(contract, "NonexistentEvent")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract'
      );
    });

    it("Should fail when expecting an event that's not in the contract to NOT be emitted", async function () {
      await expect(
        expect(contract.write.doNotEmit()).not.to.emit(
          contract,
          "NonexistentEvent"
        )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Event "NonexistentEvent" doesn\'t exist in the contract'
      );
    });

    it("Should fail when matcher is called with too many arguments", async function () {
      await expect(
        expect(contract.write.emitUint([1n])).not.to.emit(
          contract,
          "WithoutArgs",
          // @ts-expect-error
          1
        )
      ).to.be.eventually.rejectedWith(
        Error,
        "`.emit` expects only two arguments: the contract and the event name. Arguments should be asserted with the `.withArgs` helper."
      );
    });

    it("Should detect events without arguments", async function () {
      await expect(contract.write.emitWithoutArgs()).to.emit(
        contract,
        "WithoutArgs"
      );
    });

    it("Should fail when expecting an event that wasn't emitted", async function () {
      await expect(
        expect(contract.write.doNotEmit()).to.emit(contract, "WithoutArgs")
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" to be emitted, but it wasn\'t'
      );
    });

    it("Should fail when expecting a specific event NOT to be emitted but it WAS", async function () {
      await expect(
        expect(contract.write.emitWithoutArgs()).to.not.emit(
          contract,
          "WithoutArgs"
        )
      ).to.be.eventually.rejectedWith(
        AssertionError,
        'Expected event "WithoutArgs" NOT to be emitted, but it was'
      );
    });

    describe(".withArgs", function () {
      it("Should fail when used with .not.", async function () {
        expect(() =>
          expect(contract.write.emitUint([1n]))
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("Should fail when used with .not, subject is a rejected promise", async function () {
        expect(() =>
          expect(matchers.write.revertsWithoutReason())
            .not.to.emit(contract, "WithUintArg")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async function () {
        expect(() =>
          expect(contract.write.emitUint([1n]))
            // @ts-expect-error
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion"
        );
      });

      it("Should verify zero arguments", async function () {
        await expect(contract.write.emitWithoutArgs())
          .to.emit(contract, "WithoutArgs")
          .withArgs();
      });

      describe("with a uint argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitUint([1n]))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitUint([1n]))
              .to.emit(contract, "WithUintArg")
              .withArgs(2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithUintArg" event: Error in the 1st argument assertion: expected 1 to equal 2.'
          );
        });

        it("Should fail when too many arguments are given", async function () {
          await expect(
            expect(contract.write.emitUint([1n]))
              .to.emit(contract, "WithUintArg")
              .withArgs(1, 3)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithUintArg" event: Expected arguments array to have length 2, but it has 1'
          );
        });
      });

      describe("with an address argument", function () {
        // create dummy transport so we can create wallets
        const transport = custom({
          async request() {},
        });

        const wallet = createWalletClient({
          account: privateKeyToAccount(generatePrivateKey()),
          transport,
        });
        const address = wallet.account.address;

        const otherWallet = createWalletClient({
          account: privateKeyToAccount(generatePrivateKey()),
          transport,
        });
        const otherAddress = otherWallet.account.address;

        it("Should match the argument", async function () {
          await expect(contract.write.emitAddress([address]))
            .to.emit(contract, "WithAddressArg")
            .withArgs(address);
        });

        it("Should match addressable arguments", async function () {
          await expect(contract.write.emitAddress([address]))
            .to.emit(contract, "WithAddressArg")
            .withArgs(wallet);
        });

        it("Should fail when the input argument doesn't match the addressable event argument", async function () {
          await expect(
            expect(contract.write.emitAddress([address]))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherWallet)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithAddressArg" event: Error in the 1st argument assertion: expected '${address}' to equal '${otherAddress}'`
          );
        });

        it("Should fail when the input argument doesn't match the address event argument", async function () {
          await expect(
            expect(contract.write.emitAddress([address]))
              .to.emit(contract, "WithAddressArg")
              .withArgs(otherAddress)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithAddressArg" event: Error in the 1st argument assertion: expected '${address}' to equal '${otherAddress}'`
          );
        });

        it("Should fail when too many arguments are given", async function () {
          await expect(
            expect(contract.write.emitAddress([address]))
              .to.emit(contract, "WithAddressArg")
              .withArgs(address, otherAddress)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithAddressArg" event: Expected arguments array to have length 2, but it has 1'
          );
        });
      });

      // for abbreviating long strings in diff views like chai does:
      function abbrev(longString: `0x${string}`): string {
        return `${longString.substring(0, 37)}…`;
      }

      function defaultHashFunction(str: string): `0x${string}` {
        return keccak256(toHex(str));
      }

      function formatHash(str: string, hashFn = defaultHashFunction) {
        const hash = hashFn(str);
        return {
          str,
          hash,
          abbrev: abbrev(hash),
        };
      }

      function formatBytes(str: string) {
        const bytes = toHex(stringToBytes(str));
        const bytes32 = pad(bytes, { size: 32 });
        return {
          ...formatHash(str),
          bytes,
          bytes32,
          abbrev32: abbrev(bytes32),
        };
      }

      const str1 = formatBytes("string1");
      const str2 = formatBytes("string2");

      describe("with a string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitString(["string"]))
            .to.emit(contract, "WithStringArg")
            .withArgs("string");
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitString([str1.str]))
              .to.emit(contract, "WithStringArg")
              .withArgs(str2.str)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `expected '${str1.str}' to equal '${str2.str}'`
          );
        });
      });

      describe("with an indexed string argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitIndexedString([str1.str]))
            .to.emit(contract, "WithIndexedStringArg")
            .withArgs(str1.str);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitIndexedString([str1.str]))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(str2.str)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedStringArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${str2.hash}. The actual hash and the expected hash ${str1.hash} did not match: expected '${str1.abbrev}' to equal '${str2.abbrev}'`
          );
        });

        it("Should fail if expected argument is the hash not the pre-image", async function () {
          await expect(
            expect(contract.write.emitIndexedString([str1.str]))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(str1.hash)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead"
          );
        });

        it("Should fail when trying to match the event argument with an incorrect hash value", async function () {
          const incorrect = formatHash(
            str2.hash,
            keccak256 as (str: string) => `0x${string}`
          );
          await expect(
            expect(contract.write.emitIndexedString([str1.str]))
              .to.emit(contract, "WithIndexedStringArg")
              .withArgs(incorrect.str)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedStringArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${incorrect.hash}. The actual hash and the expected hash ${str1.hash} did not match: expected '${str1.abbrev}' to equal '${incorrect.abbrev}`
          );
        });
      });

      describe("with a bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitBytes([str1.bytes]))
            .to.emit(contract, "WithBytesArg")
            .withArgs(str1.bytes);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitBytes([str2.bytes]))
              .to.emit(contract, "WithBytesArg")
              .withArgs(str1.str)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytesArg" event: Error in the 1st argument assertion: expected '${str2.bytes}' to equal '${str1.str}'`
          );
        });
      });

      describe("with an indexed bytes argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitIndexedBytes([str1.bytes]))
            .to.emit(contract, "WithIndexedBytesArg")
            .withArgs(str1.str);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitIndexedBytes([str2.bytes]))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(str1.str)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedBytesArg" event: Error in the 1st argument assertion: The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${str1.hash}. The actual hash and the expected hash ${str2.hash} did not match: expected '${str2.abbrev}' to equal '${str1.abbrev}'`
          );
        });

        it("Should fail the passerd argument is the hash, not the pre-image", async function () {
          await expect(
            expect(contract.write.emitIndexedBytes([str1.bytes]))
              .to.emit(contract, "WithIndexedBytesArg")
              .withArgs(str1.hash)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead."
          );
        });
      });

      describe("with a bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitBytes32([str1.bytes32]))
            .to.emit(contract, "WithBytes32Arg")
            .withArgs(str1.bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitBytes32([str2.bytes32]))
              .to.emit(contract, "WithBytes32Arg")
              .withArgs(str1.bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytes32Arg" event: Error in the 1st argument assertion: expected '${str2.abbrev32}' to equal '${str1.abbrev32}'`
          );
        });
      });

      describe("with an indexed bytes32 argument", function () {
        it("Should match the argument", async function () {
          await expect(contract.write.emitIndexedBytes32([str1.bytes32]))
            .to.emit(contract, "WithIndexedBytes32Arg")
            .withArgs(str1.bytes32);
        });

        it("Should fail when the input argument doesn't match the event argument", async function () {
          await expect(
            expect(contract.write.emitIndexedBytes32([str2.bytes32]))
              .to.emit(contract, "WithIndexedBytes32Arg")
              .withArgs(str1.bytes32)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithIndexedBytes32Arg" event: Error in the 1st argument assertion: expected '${str2.abbrev32}' to equal '${str1.abbrev32}'`
          );
        });
      });

      describe("with a uint array argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.write.emitUintArray([1n, 2n]))
            .to.emit(contract, "WithUintArray")
            .withArgs([1, 2]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.write.emitUintArray([1n, 2n]))
              .to.emit(contract, "WithUintArray")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.`
          );
        });

        describe("nested predicate", function () {
          it("Should succeed when predicate passes", async function () {
            await expect(contract.write.emitUintArray([1n, 2n]))
              .to.emit(contract, "WithUintArray")
              .withArgs([anyValue, 2]);
          });

          it("Should fail when predicate returns false", async function () {
            await expect(
              expect(contract.write.emitUintArray([1n, 2n]))
                .to.emit(contract, "WithUintArray")
                .withArgs([() => false, 4])
            ).to.be.eventually.rejectedWith(
              AssertionError,
              `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: The predicate did not return true`
            );
          });

          it("Should fail when predicate reverts", async function () {
            await expect(
              expect(contract.write.emitUintArray([1n, 2n]))
                .to.emit(contract, "WithUintArray")
                .withArgs([
                  () => {
                    throw new Error("user error");
                  },
                  4,
                ])
            ).to.be.eventually.rejectedWith(
              AssertionError,
              `Error in "WithUintArray" event: Error in the 1st argument assertion: Error in the 1st argument assertion: The predicate threw when called: user error`
            );
          });
        });

        describe("arrays different length", function () {
          it("Should fail when the array is shorter", async function () {
            await expect(
              expect(contract.write.emitUintArray([1n, 2n]))
                .to.emit(contract, "WithUintArray")
                .withArgs([1])
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArray" event: Error in the 1st argument assertion: Expected arguments array to have length 1, but it has 2'
            );
          });

          it("Should fail when the array is longer", async function () {
            await expect(
              expect(contract.write.emitUintArray([1n, 2n]))
                .to.emit(contract, "WithUintArray")
                .withArgs([1, 2, 3])
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArray" event: Error in the 1st argument assertion: Expected arguments array to have length 3, but it has 2'
            );
          });
        });
      });

      describe("with a bytes32 array argument", function () {
        const aa: `0x${string}` = `0x${"aa".repeat(32)}`;
        const bb: `0x${string}` = `0x${"bb".repeat(32)}`;
        const cc: `0x${string}` = `0x${"cc".repeat(32)}`;
        const dd: `0x${string}` = `0x${"dd".repeat(32)}`;

        it("Should succeed when expectations are met", async function () {
          await expect(contract.write.emitBytes32Array([aa, bb]))
            .to.emit(contract, "WithBytes32Array")
            .withArgs([aa, bb]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.write.emitBytes32Array([aa, bb]))
              .to.emit(contract, "WithBytes32Array")
              .withArgs([cc, dd])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Error in "WithBytes32Array" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected '${abbrev(
              aa
            )}' to equal '${abbrev(cc)}'`
          );
        });
      });

      describe("with a struct argument", function () {
        it("Should succeed when expectations are met", async function () {
          await expect(contract.write.emitStruct([1n, 2n]))
            .to.emit(contract, "WithStructArg")
            .withArgs([1, 2]);
        });

        it("Should fail when expectations are not met", async function () {
          await expect(
            expect(contract.write.emitStruct([1n, 2n]))
              .to.emit(contract, "WithStructArg")
              .withArgs([3, 4])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithStructArg" event: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.'
          );
        });
      });

      describe("with multiple arguments", function () {
        it("Should successfully match the arguments", async function () {
          await expect(contract.write.emitTwoUints([1n, 2n]))
            .to.emit(contract, "WithTwoUintArgs")
            .withArgs(1, 2);
        });

        it("Should fail when the first argument isn't matched", async function () {
          await expect(
            expect(contract.write.emitTwoUints([1n, 2n]))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(2, 2)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Error in the 1st argument assertion: expected 1 to equal 2'
          );
        });

        it("Should fail when the second argument isn't matched", async function () {
          await expect(
            expect(contract.write.emitTwoUints([1n, 2n]))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Error in the 2nd argument assertion: expected 2 to equal 1.'
          );
        });

        it("Should fail when too many arguments are supplied", async function () {
          await expect(
            expect(contract.write.emitTwoUints([1n, 2n]))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1, 2, 3, 4)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Expected arguments array to have length 4, but it has 2'
          );
        });

        it("Should fail when too few arguments are supplied", async function () {
          await expect(
            expect(contract.write.emitTwoUints([1n, 2n]))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(1)
          ).to.be.eventually.rejectedWith(
            AssertionError,
            'Error in "WithTwoUintArgs" event: Expected arguments array to have length 1, but it has 2'
          );
        });

        describe("Should handle argument predicates", function () {
          it("Should pass when a predicate argument returns true", async function () {
            await expect(contract.write.emitTwoUints([1n, 2n]))
              .to.emit(contract, "WithTwoUintArgs")
              .withArgs(anyValue, anyUint);
          });

          it("Should fail when a predicate argument returns false", async function () {
            await expect(
              expect(contract.write.emitTwoUints([1n, 2n]))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1, () => false)
            ).to.be.rejectedWith(
              AssertionError,
              'Error in "WithTwoUintArgs" event: Error in the 2nd argument assertion: The predicate did not return true'
            );
          });

          it("Should fail when a predicate argument throws an error", async function () {
            await expect(
              expect(contract.write.emitTwoUints([1n, 2n]))
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(() => {
                  throw new Error("user-defined error");
                }, "foo")
            ).to.be.rejectedWith(
              Error,
              'Error in "WithTwoUintArgs" event: Error in the 1st argument assertion: The predicate threw when called: user-defined error'
            );
          });

          describe("with predicate anyUint", function () {
            it("Should fail when the event argument is a string", async function () {
              await expect(
                expect(contract.write.emitString(["a string"]))
                  .to.emit(contract, "WithStringArg")
                  .withArgs(anyUint)
              ).to.be.rejectedWith(
                AssertionError,
                "Error in \"WithStringArg\" event: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an integer, but its type was 'string'"
              );
            });

            it("Should fail when the event argument is negative", async function () {
              await expect(
                expect(contract.write.emitInt([-1n]))
                  .to.emit(contract, "WithIntArg")
                  .withArgs(anyUint)
              ).to.be.rejectedWith(
                AssertionError,
                'Error in "WithIntArg" event: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an unsigned integer, but it was negative, with value -1'
              );
            });
          });
        });
      });
    });

    describe("With one call that emits two separate events", function () {
      it("Should successfully catch each event independently", async function () {
        await expect(
          contract.write.emitUintAndString([1n, "a string"])
        ).to.emit(contract, "WithUintArg");
        await expect(
          contract.write.emitUintAndString([1n, "a string"])
        ).to.emit(contract, "WithStringArg");
      });
      describe("When detecting two events from one call (chaining)", function () {
        it("Should succeed when both expected events are indeed emitted", async function () {
          await expect(contract.write.emitUintAndString([1n, "a string"]))
            .to.emit(contract, "WithUintArg")
            .and.to.emit(contract, "WithStringArg");
        });
        it("Should succeed when the expected event is emitted and the unexpected event is not", async function () {
          await expect(contract.write.emitWithoutArgs())
            .to.emit(contract, "WithoutArgs")
            .and.not.to.emit(otherContract, "WithUintArg");
        });
        describe("When one of the expected events is emitted and the other is not", function () {
          it("Should fail when the first expected event is emitted but the second is not", async function () {
            await expect(
              expect(contract.write.emitUint([1n]))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
          it("Should fail when the second expected event is emitted but the first is not", async function () {
            await expect(
              expect(contract.write.emitUint([1n]))
                .to.emit(contract, "WithStringArg")
                .and.to.emit(contract, "WithUintArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Expected event "WithStringArg" to be emitted, but it wasn\'t'
            );
          });
        });
        describe("When specifying .withArgs()", function () {
          it("Should pass when expecting the correct args from the first event", async function () {
            await expect(contract.write.emitUintAndString([1n, "a string"]))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg");
          });

          it("Should pass when expecting the correct args from the second event", async function () {
            await expect(contract.write.emitUintAndString([1n, "a string"]))
              .to.emit(contract, "WithUintArg")
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });

          it("Should pass when expecting the correct args from both events", async function () {
            await expect(contract.write.emitUintAndString([1n, "a string"]))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithStringArg")
              .withArgs("a string");
          });

          it("Should fail when expecting the wrong argument value for the first event", async function () {
            await expect(
              expect(contract.write.emitUintAndString([1n, "a string"]))
                .to.emit(contract, "WithUintArg")
                .withArgs(2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArg" event: Error in the 1st argument assertion: expected 1 to equal 2.'
            );
          });

          it("Should fail when expecting the wrong argument value for the second event", async function () {
            await expect(
              expect(contract.write.emitUintAndString([1n, "a string"]))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              "Error in \"WithStringArg\" event: Error in the 1st argument assertion: expected 'a string' to equal 'a different string'"
            );
          });

          it("Should fail when expecting too many arguments from the first event", async function () {
            await expect(
              expect(contract.write.emitUintAndString([1n, "a string"]))
                .to.emit(contract, "WithUintArg")
                .withArgs(1, 2)
                .and.to.emit(contract, "WithStringArg")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithUintArg" event: Expected arguments array to have length 2, but it has 1'
            );
          });

          it("Should fail when expecting too many arguments from the second event", async function () {
            await expect(
              expect(contract.write.emitUintAndString([1n, "a string"]))
                .to.emit(contract, "WithUintArg")
                .and.to.emit(contract, "WithStringArg")
                .withArgs("a different string", "yet another string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithStringArg" event: Expected arguments array to have length 2, but it has 1'
            );
          });

          it("Should fail when expecting too few arguments from the first event", async function () {
            await expect(
              expect(
                contract.write.emitTwoUintsAndTwoStrings([
                  1n,
                  2n,
                  "a string",
                  "another string",
                ])
              )
                .to.emit(contract, "WithTwoUintArgs")
                .withArgs(1)
                .and.to.emit(contract, "WithTwoStringArgs")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithTwoUintArgs" event: Expected arguments array to have length 1, but it has 2'
            );
          });

          it("Should fail when expecting too few arguments from the second event", async function () {
            await expect(
              expect(
                contract.write.emitTwoUintsAndTwoStrings([
                  1n,
                  2n,
                  "a string",
                  "another string",
                ])
              )
                .to.emit(contract, "WithTwoUintArgs")
                .and.to.emit(contract, "WithTwoStringArgs")
                .withArgs("a string")
            ).to.be.eventually.rejectedWith(
              AssertionError,
              'Error in "WithTwoStringArgs" event: Expected arguments array to have length 1, but it has 2'
            );
          });
        });

        describe("With a contract that emits the same event twice but with different arguments", function () {
          it("Should pass when expectations are met", async function () {
            await expect(contract.write.emitUintTwice([1n, 2n]))
              .to.emit(contract, "WithUintArg")
              .withArgs(1)
              .and.to.emit(contract, "WithUintArg")
              .withArgs(2);
          });

          it("Should fail when the first event's argument is not matched", async function () {
            await expect(
              expect(contract.write.emitUintTwice([1n, 2n]))
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
              expect(contract.write.emitUintTwice([1n, 2n]))
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
              expect(contract.write.emitUintTwice([1n, 2n]))
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
          await expect(contract.write.emitNestedUintFromSameContract([1n]))
            .to.emit(contract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the expected event is not emitted", async function () {
          await expect(
            expect(contract.write.emitNestedUintFromSameContract([1n])).to.emit(
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
          await expect(contract.write.emitNestedUintFromAnotherContract([1n]))
            .to.emit(otherContract, "WithUintArg")
            .withArgs(1);
        });

        it("Should fail when the expected event is emitted but not by the contract that was passed", async function () {
          await expect(
            expect(contract.write.emitNestedUintFromAnotherContract([1n]))
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
      await expect(contract.write.emitWithoutArgs()).to.emit(
        contract,
        "WithoutArgs"
      );
    });

    it("With transaction hash", async () => {
      const txHash = await contract.write.emitWithoutArgs();
      await expect(txHash).to.emit(contract, "WithoutArgs");
    });
  }
});
