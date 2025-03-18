import type { Token } from "../../src/internal/matchers/changeTokenBalance.js";
import type {
  AnotherContract,
  EventsContract,
  MatchersContract,
} from "../helpers/contracts.js";
import type {
  HardhatEthers,
  HardhatEthersSigner,
} from "@nomicfoundation/hardhat-ethers/types";
import type { TransactionResponse } from "ethers";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useFixtureProjectCopy,
} from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";
import {
  CHANGE_TOKEN_BALANCE_MATCHER,
  CHANGE_TOKEN_BALANCES_MATCHER,
} from "../../src/internal/constants.js";
import { clearTokenDescriptionsCache } from "../../src/internal/matchers/changeTokenBalance.js";
import { initEnvironment } from "../helpers/helpers.js";

addChaiMatchers();

describe(
  "INTEGRATION: changeTokenBalance and changeTokenBalances matchers",
  { timeout: 60000 },
  () => {
    describe("with the in-process hardhat network", () => {
      useFixtureProjectCopy("hardhat-project");
      runTests();
    });

    afterEach(() => {
      clearTokenDescriptionsCache();
    });

    function runTests() {
      let sender: HardhatEthersSigner;
      let receiver: HardhatEthersSigner;
      let mockToken: Token;
      let matchers: MatchersContract;
      let otherContract: AnotherContract;
      let contract: EventsContract;

      let provider: EthereumProvider;
      let ethers: HardhatEthers;

      before(async () => {
        ({ ethers, provider } = await initEnvironment("change-token-balance"));
      });

      beforeEach(async () => {
        const wallets = await ethers.getSigners();
        sender = wallets[0];
        receiver = wallets[1];

        const MockToken = await ethers.getContractFactory<[], Token>(
          "MockToken",
        );
        mockToken = await MockToken.deploy();

        const Matchers = await ethers.getContractFactory<[], MatchersContract>(
          "Matchers",
        );
        matchers = await Matchers.deploy();

        otherContract = await ethers.deployContract("AnotherContract");
        contract = await (
          await ethers.getContractFactory<[string], EventsContract>("Events")
        ).deploy(await otherContract.getAddress());
      });

      describe("transaction that doesn't move tokens", () => {
        it("with a promise of a TxResponse", async () => {
          const transactionResponse = sender.sendTransaction({
            to: receiver.address,
          });

          await runAllAsserts(
            provider,
            transactionResponse,
            mockToken,
            [sender, receiver],
            [0, 0],
          );
        });

        it("with a TxResponse", async () => {
          await runAllAsserts(
            provider,
            await sender.sendTransaction({
              to: receiver.address,
            }),
            mockToken,
            [sender, receiver],
            [0, 0],
          );
        });

        it("with a function that returns a promise of a TxResponse", async () => {
          await runAllAsserts(
            provider,
            () => sender.sendTransaction({ to: receiver.address }),
            mockToken,
            [sender, receiver],
            [0, 0],
          );
        });

        it("with a function that returns a TxResponse", async () => {
          const txResponse = await sender.sendTransaction({
            to: receiver.address,
          });
          await runAllAsserts(
            provider,
            () => txResponse,
            mockToken,
            [sender, receiver],
            [0, 0],
          );
        });

        it("accepts addresses", async () => {
          await expect(
            sender.sendTransaction({ to: receiver.address }),
          ).to.changeTokenBalance(provider, mockToken, sender.address, 0);

          await expect(() =>
            sender.sendTransaction({ to: receiver.address }),
          ).to.changeTokenBalances(
            provider,
            mockToken,
            [sender.address, receiver.address],
            [0, 0],
          );

          // mixing signers and addresses
          await expect(() =>
            sender.sendTransaction({ to: receiver.address }),
          ).to.changeTokenBalances(
            provider,
            mockToken,
            [sender.address, receiver],
            [0, 0],
          );
        });

        it("negated", async () => {
          await expect(
            sender.sendTransaction({ to: receiver.address }),
          ).to.not.changeTokenBalance(provider, mockToken, sender, 1);

          await expect(
            sender.sendTransaction({ to: receiver.address }),
          ).to.not.changeTokenBalance(
            provider,
            mockToken,
            sender,
            (diff: bigint) => diff > 0n,
          );

          await expect(() =>
            sender.sendTransaction({ to: receiver.address }),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [0, 1],
          );

          await expect(() =>
            sender.sendTransaction({ to: receiver.address }),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [1, 0],
          );

          await expect(() =>
            sender.sendTransaction({ to: receiver.address }),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [1, 1],
          );
        });

        describe("assertion failures", () => {
          it("doesn't change balance as expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.changeTokenBalance(provider, mockToken, sender, 1),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to change by 1, but it changed by 0/,
            );
          });

          it("change balance doesn't satisfies the predicate", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.changeTokenBalance(
                provider,
                mockToken,
                sender,
                (diff: bigint) => diff > 0n,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to satisfy the predicate, but it didn't \(token balance change: 0 wei\)/,
            );
          });

          it("changes balance in the way it was not expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.not.changeTokenBalance(provider, mockToken, sender, 0),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" NOT to change by 0, but it did/,
            );
          });

          it("changes balance doesn't have to satisfy the predicate, but it did", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.not.changeTokenBalance(
                provider,
                mockToken,
                sender,
                (diff: bigint) => diff < 1n,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to NOT satisfy the predicate, but it did \(token balance change: 0 wei\)/,
            );
          });

          it("the first account doesn't change its balance as expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [1, 0],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("the second account doesn't change its balance as expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [0, 1],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("neither account changes its balance as expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [1, 1],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("accounts change their balance in the way it was not expected", async () => {
            await expect(
              expect(
                sender.sendTransaction({ to: receiver.address }),
              ).to.not.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [0, 0],
              ),
            ).to.be.rejectedWith(AssertionError);
          });
        });
      });

      describe("Transaction Callback", () => {
        it("should pass when given predicate", async () => {
          await expect(() =>
            mockToken.transfer(receiver.address, 75),
          ).to.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            ([senderDiff, receiverDiff]: bigint[]) =>
              senderDiff === -75n && receiverDiff === 75n,
          );
        });

        it("should fail when the predicate returns false", async () => {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 75),
            ).to.changeTokenBalances(
              provider,
              mockToken,
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -74n && receiverDiff === 75n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of MCK to satisfy the predicate, but they didn't",
          );
        });

        it("should fail when the predicate returns true and the assertion is negated", async () => {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 75),
            ).to.not.changeTokenBalances(
              provider,
              mockToken,
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -75n && receiverDiff === 75n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of MCK to NOT satisfy the predicate, but they did",
          );
        });
      });

      describe("transaction that transfers some tokens", () => {
        it("with a promise of a TxResponse", async () => {
          await runAllAsserts(
            provider,
            mockToken.transfer(receiver.address, 50),
            mockToken,
            [sender, receiver],
            [-50, 50],
          );

          await runAllAsserts(
            provider,
            mockToken.transfer(receiver.address, 100),
            mockToken,
            [sender, receiver],
            [-100, 100],
          );
        });

        it("with a TxResponse", async () => {
          await runAllAsserts(
            provider,
            await mockToken.transfer(receiver.address, 150),
            mockToken,
            [sender, receiver],
            [-150, 150],
          );
        });

        it("with a function that returns a promise of a TxResponse", async () => {
          await runAllAsserts(
            provider,
            () => mockToken.transfer(receiver.address, 200),
            mockToken,
            [sender, receiver],
            [-200, 200],
          );
        });

        it("with a function that returns a TxResponse", async () => {
          const txResponse = await mockToken.transfer(receiver.address, 300);
          await runAllAsserts(
            provider,
            () => txResponse,
            mockToken,
            [sender, receiver],
            [-300, 300],
          );
        });

        it("changeTokenBalance shouldn't run the transaction twice", async () => {
          const receiverBalanceBefore = await mockToken.balanceOf(
            receiver.address,
          );

          await expect(() =>
            mockToken.transfer(receiver.address, 50),
          ).to.changeTokenBalance(provider, mockToken, receiver, 50);

          const receiverBalanceChange =
            (await mockToken.balanceOf(receiver.address)) -
            receiverBalanceBefore;

          expect(receiverBalanceChange).to.equal(50n);
        });

        it("changeTokenBalances shouldn't run the transaction twice", async () => {
          const receiverBalanceBefore = await mockToken.balanceOf(
            receiver.address,
          );

          await expect(() =>
            mockToken.transfer(receiver.address, 50),
          ).to.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [-50, 50],
          );

          const receiverBalanceChange =
            (await mockToken.balanceOf(receiver.address)) -
            receiverBalanceBefore;

          expect(receiverBalanceChange).to.equal(50n);
        });

        it("negated", async () => {
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.not.changeTokenBalance(provider, mockToken, sender, 0);
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.not.changeTokenBalance(provider, mockToken, sender, 1);

          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [0, 0],
          );
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [-50, 0],
          );
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.not.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [0, 50],
          );
        });

        describe("assertion failures", () => {
          it("doesn't change balance as expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalance(provider, mockToken, receiver, 500),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to change by 500, but it changed by 50/,
            );
          });

          it("change balance doesn't satisfies the predicate", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalance(
                provider,
                mockToken,
                receiver,
                (diff: bigint) => diff === 500n,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to satisfy the predicate, but it didn't \(token balance change: 50 wei\)/,
            );
          });

          it("changes balance in the way it was not expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.not.changeTokenBalance(provider, mockToken, receiver, 50),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" NOT to change by 50, but it did/,
            );
          });

          it("changes balance doesn't have to satisfy the predicate, but it did", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.not.changeTokenBalance(
                provider,
                mockToken,
                receiver,
                (diff: bigint) => diff === 50n,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MCK tokens for "0x\w{40}" to NOT satisfy the predicate, but it did \(token balance change: 50 wei\)/,
            );
          });

          it("the first account doesn't change its balance as expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-100, 50],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("the second account doesn't change its balance as expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-50, 100],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("neither account changes its balance as expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [0, 0],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("accounts change their balance in the way it was not expected", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.not.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-50, 50],
              ),
            ).to.be.rejectedWith(AssertionError);
          });

          it("uses the token name if the contract doesn't have a symbol", async () => {
            const TokenWithOnlyName = await ethers.getContractFactory<
              [],
              Token
            >("TokenWithOnlyName");

            const tokenWithOnlyName = await TokenWithOnlyName.deploy();

            await expect(
              expect(
                tokenWithOnlyName.transfer(receiver.address, 50),
              ).to.changeTokenBalance(
                provider,
                tokenWithOnlyName,
                receiver,
                500,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MockToken tokens for "0x\w{40}" to change by 500, but it changed by 50/,
            );

            await expect(
              expect(
                tokenWithOnlyName.transfer(receiver.address, 50),
              ).to.not.changeTokenBalance(
                provider,
                tokenWithOnlyName,
                receiver,
                50,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of MockToken tokens for "0x\w{40}" NOT to change by 50, but it did/,
            );
          });

          it("uses the contract address if the contract doesn't have name or symbol", async () => {
            const TokenWithoutNameNorSymbol = await ethers.getContractFactory<
              [],
              Token
            >("TokenWithoutNameNorSymbol");

            const tokenWithoutNameNorSymbol =
              await TokenWithoutNameNorSymbol.deploy();

            await expect(
              expect(
                tokenWithoutNameNorSymbol.transfer(receiver.address, 50),
              ).to.changeTokenBalance(
                provider,
                tokenWithoutNameNorSymbol,
                receiver,
                500,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of <token at 0x\w{40}> tokens for "0x\w{40}" to change by 500, but it changed by 50/,
            );

            await expect(
              expect(
                tokenWithoutNameNorSymbol.transfer(receiver.address, 50),
              ).to.not.changeTokenBalance(
                provider,
                tokenWithoutNameNorSymbol,
                receiver,
                50,
              ),
            ).to.be.rejectedWith(
              AssertionError,
              /Expected the balance of <token at 0x\w{40}> tokens for "0x\w{40}" NOT to change by 50, but it did/,
            );
          });

          it("changeTokenBalance: Should throw if chained to another non-chainable method", () => {
            assertThrowsHardhatError(
              () =>
                expect(contract.emitWithoutArgs())
                  .to.emit(contract, "WithoutArgs")
                  .and.to.changeTokenBalance(provider, mockToken, receiver, 0),
              HardhatError.ERRORS.CHAI_MATCHERS.MATCHER_CANNOT_BE_CHAINED_AFTER,
              {
                matcher: "changeTokenBalance",
                previousMatcher: "emit",
              },
            );
          });

          it("changeTokenBalances: should throw if chained to another non-chainable method", () => {
            assertThrowsHardhatError(
              () =>
                expect(matchers.revertWithCustomErrorWithInt(1))
                  .to.be.reverted(ethers)
                  .and.to.changeTokenBalances(
                    provider,
                    mockToken,
                    [sender, receiver],
                    [-50, 100],
                  ),
              HardhatError.ERRORS.CHAI_MATCHERS.MATCHER_CANNOT_BE_CHAINED_AFTER,
              {
                matcher: "changeTokenBalances",
                previousMatcher: "reverted",
              },
            );
          });
        });
      });

      describe("validation errors", () => {
        describe(CHANGE_TOKEN_BALANCE_MATCHER, () => {
          it("token is not specified", async () => {
            assertThrowsHardhatError(
              () =>
                expect(
                  mockToken.transfer(receiver.address, 50),
                  // @ts-expect-error -- force error scenario: token should be specified
                ).to.changeTokenBalance(provider, receiver, 50),
              HardhatError.ERRORS.CHAI_MATCHERS
                .FIRST_ARGUMENT_MUST_BE_A_CONTRACT_INSTANCE,
              {
                method: CHANGE_TOKEN_BALANCE_MATCHER,
              },
            );

            // if an address is used (receiver.address)
            assertThrowsHardhatError(
              () =>
                expect(
                  mockToken.transfer(receiver.address, 50),
                  // @ts-expect-error -- force error scenario: token should be specified
                ).to.changeTokenBalance(provider, receiver.address, 50),
              HardhatError.ERRORS.CHAI_MATCHERS
                .FIRST_ARGUMENT_MUST_BE_A_CONTRACT_INSTANCE,
              {
                method: CHANGE_TOKEN_BALANCE_MATCHER,
              },
            );
          });

          it("contract is not a token", async () => {
            const NotAToken = await ethers.getContractFactory("NotAToken");
            const notAToken = await NotAToken.deploy();

            expect(() =>
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalance(provider, notAToken, sender, -50),
            ).to.throw(
              Error,
              "The given contract instance is not an ERC20 token",
            );
          });

          it("tx is not the only one in the block", async () => {
            await provider.request({
              method: "evm_setAutomine",
              params: [false],
            });

            // we set a gas limit to avoid using the whole block gas limit
            await sender.sendTransaction({
              to: receiver.address,
              gasLimit: 30_000,
            });

            await provider.request({
              method: "evm_setAutomine",
              params: [true],
            });

            await expect(
              expect(
                mockToken.transfer(receiver.address, 50, { gasLimit: 100_000 }),
              ).to.changeTokenBalance(provider, mockToken, sender, -50),
            ).to.be.rejectedWith(
              "There should be only 1 transaction in the block",
            );
          });

          it("tx reverts", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 0),
              ).to.changeTokenBalance(provider, mockToken, sender, -50),
            ).to.be.rejectedWith(
              Error,
              // check that the error message includes the revert reason
              "Transferred value is zero",
            );
          });
        });

        describe(CHANGE_TOKEN_BALANCES_MATCHER, () => {
          it("token is not specified", async () => {
            assertThrowsHardhatError(
              () =>
                expect(
                  mockToken.transfer(receiver.address, 50),
                  // @ts-expect-error -- force error scenario: token should be specified
                ).to.changeTokenBalances(
                  provider,
                  [sender, receiver],
                  [-50, 50],
                ),
              HardhatError.ERRORS.CHAI_MATCHERS
                .FIRST_ARGUMENT_MUST_BE_A_CONTRACT_INSTANCE,
              {
                method: CHANGE_TOKEN_BALANCES_MATCHER,
              },
            );
          });

          it("contract is not a token", async () => {
            const NotAToken = await ethers.getContractFactory("NotAToken");
            const notAToken = await NotAToken.deploy();

            expect(() =>
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                notAToken,
                [sender, receiver],
                [-50, 50],
              ),
            ).to.throw(
              Error,
              "The given contract instance is not an ERC20 token",
            );
          });
          it("arrays have different length", async () => {
            expect(() =>
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender],
                [-50, 50],
              ),
            ).to.throw(
              Error,
              "The number of accounts (1) is different than the number of expected balance changes (2)",
            );

            expect(() =>
              expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-50],
              ),
            ).to.throw(
              Error,
              "The number of accounts (2) is different than the number of expected balance changes (1)",
            );
          });

          it("arrays have different length, subject is a rejected promise", async () => {
            expect(() =>
              expect(matchers.revertsWithoutReason()).to.changeTokenBalances(
                provider,
                mockToken,
                [sender],
                [-50, 50],
              ),
            ).to.throw(
              Error,
              "The number of accounts (1) is different than the number of expected balance changes (2)",
            );
          });

          it("tx is not the only one in the block", async () => {
            await provider.request({
              method: "evm_setAutomine",
              params: [false],
            });

            // we set a gas limit to avoid using the whole block gas limit
            await sender.sendTransaction({
              to: receiver.address,
              gasLimit: 30_000,
            });

            await provider.request({
              method: "evm_setAutomine",
              params: [true],
            });

            await expect(
              expect(
                mockToken.transfer(receiver.address, 50, { gasLimit: 100_000 }),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-50, 50],
              ),
            ).to.be.rejectedWith(
              "There should be only 1 transaction in the block",
            );
          });

          it("tx reverts", async () => {
            await expect(
              expect(
                mockToken.transfer(receiver.address, 0),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-50, 50],
              ),
            ).to.be.rejectedWith(
              Error,
              // check that the error message includes the revert reason
              "Transferred value is zero",
            );
          });
        });
      });

      describe("accepted number types", () => {
        it("native bigints are accepted", async () => {
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.changeTokenBalance(provider, mockToken, sender, -50n);
          await expect(
            mockToken.transfer(receiver.address, 50),
          ).to.changeTokenBalances(
            provider,
            mockToken,
            [sender, receiver],
            [-50n, 50n],
          );
        });
      });

      // smoke tests for stack traces
      describe("stack traces", () => {
        describe(CHANGE_TOKEN_BALANCE_MATCHER, () => {
          it("includes test file", async () => {
            let hasProperStackTrace = false;
            try {
              await expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalance(provider, mockToken, sender, -100);
            } catch (e) {
              hasProperStackTrace = util
                .inspect(e)
                .includes(
                  path.join("test", "matchers", "changeTokenBalance.ts"),
                );
            }
            expect(hasProperStackTrace).to.equal(true);
          });
        });

        describe(CHANGE_TOKEN_BALANCES_MATCHER, () => {
          it("includes test file", async () => {
            try {
              await expect(
                mockToken.transfer(receiver.address, 50),
              ).to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [-100, 100],
              );
            } catch (e) {
              expect(util.inspect(e)).to.include(
                path.join("test", "matchers", "changeTokenBalance.ts"),
              );
              return;
            }
            expect.fail("Expected an exception but none was thrown");
          });
        });
      });
    }
  },
);

function zip<T, U>(a: T[], b: U[]): Array<[T, U]> {
  assert(a.length === b.length, "lengths should match");

  return a.map((x, i) => [x, b[i]]);
}

/**
 * Given an expression `expr`, a token, and a pair of arrays, check that
 * `changeTokenBalance` and `changeTokenBalances` behave correctly in different
 * scenarios.
 */
async function runAllAsserts(
  provider: EthereumProvider,
  expr:
    | TransactionResponse
    | Promise<TransactionResponse>
    | (() => TransactionResponse)
    | (() => Promise<TransactionResponse>),
  token: Token,
  accounts: Array<string | HardhatEthersSigner>,
  balances: Array<number | bigint>,
) {
  // changeTokenBalances works for the given arrays
  await expect(expr).to.changeTokenBalances(
    provider,
    token,
    accounts,
    balances,
  );

  // changeTokenBalances works for empty arrays
  await expect(expr).to.changeTokenBalances(provider, token, [], []);

  // for each given pair of account and balance, check that changeTokenBalance
  // works correctly
  for (const [account, balance] of zip(accounts, balances)) {
    await expect(expr).to.changeTokenBalance(provider, token, account, balance);
  }
}
