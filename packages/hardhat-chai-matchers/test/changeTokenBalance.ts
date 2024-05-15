import type { TransactionResponse } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Token } from "../src/internal/changeTokenBalance";
import type { MatchersContract } from "./contracts";

import assert from "assert";
import { AssertionError, expect } from "chai";
import path from "path";
import util from "util";

import "../src/internal/add-chai-matchers";
import { clearTokenDescriptionsCache } from "../src/internal/changeTokenBalance";
import {
  CHANGE_TOKEN_BALANCE_MATCHER,
  CHANGE_TOKEN_BALANCES_MATCHER,
} from "../src/internal/constants";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe("INTEGRATION: changeTokenBalance and changeTokenBalances matchers", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  afterEach(function () {
    clearTokenDescriptionsCache();
  });

  function runTests() {
    let sender: HardhatEthersSigner;
    let receiver: HardhatEthersSigner;
    let mockToken: Token;
    let matchers: MatchersContract;

    beforeEach(async function () {
      const wallets = await this.hre.ethers.getSigners();
      sender = wallets[0];
      receiver = wallets[1];

      const MockToken = await this.hre.ethers.getContractFactory<[], Token>(
        "MockToken"
      );
      mockToken = await MockToken.deploy();

      const Matchers = await this.hre.ethers.getContractFactory<
        [],
        MatchersContract
      >("Matchers");
      matchers = await Matchers.deploy();
    });

    describe("transaction that doesn't move tokens", () => {
      it("with a promise of a TxResponse", async function () {
        const transactionResponse = sender.sendTransaction({
          to: receiver.address,
        });
        await runAllAsserts(
          transactionResponse,
          mockToken,
          [sender, receiver],
          [0, 0]
        );
      });

      it("with a TxResponse", async function () {
        await runAllAsserts(
          await sender.sendTransaction({
            to: receiver.address,
          }),
          mockToken,
          [sender, receiver],
          [0, 0]
        );
      });

      it("with a function that returns a promise of a TxResponse", async function () {
        await runAllAsserts(
          () => sender.sendTransaction({ to: receiver.address }),
          mockToken,
          [sender, receiver],
          [0, 0]
        );
      });

      it("with a function that returns a TxResponse", async function () {
        const txResponse = await sender.sendTransaction({
          to: receiver.address,
        });
        await runAllAsserts(
          () => txResponse,
          mockToken,
          [sender, receiver],
          [0, 0]
        );
      });

      it("accepts addresses", async function () {
        await expect(
          sender.sendTransaction({ to: receiver.address })
        ).to.changeTokenBalance(mockToken, sender.address, 0);

        await expect(() =>
          sender.sendTransaction({ to: receiver.address })
        ).to.changeTokenBalances(
          mockToken,
          [sender.address, receiver.address],
          [0, 0]
        );

        // mixing signers and addresses
        await expect(() =>
          sender.sendTransaction({ to: receiver.address })
        ).to.changeTokenBalances(mockToken, [sender.address, receiver], [0, 0]);
      });

      it("negated", async function () {
        await expect(
          sender.sendTransaction({ to: receiver.address })
        ).to.not.changeTokenBalance(mockToken, sender, 1);

        await expect(
          sender.sendTransaction({ to: receiver.address })
        ).to.not.changeTokenBalance(
          mockToken,
          sender,
          (diff: bigint) => diff > BigInt(0)
        );

        await expect(() =>
          sender.sendTransaction({ to: receiver.address })
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [0, 1]);

        await expect(() =>
          sender.sendTransaction({ to: receiver.address })
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [1, 0]);

        await expect(() =>
          sender.sendTransaction({ to: receiver.address })
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [1, 1]);
      });

      describe("assertion failures", function () {
        it("doesn't change balance as expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.changeTokenBalance(mockToken, sender, 1)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to change by 1, but it changed by 0/
          );
        });

        it("change balance doesn't satisfies the predicate", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.changeTokenBalance(
              mockToken,
              sender,
              (diff: bigint) => diff > BigInt(0)
            )
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to satisfy the predicate, but it didn't \(change by: 0 wei\)/
          );
        });

        it("changes balance in the way it was not expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.not.changeTokenBalance(mockToken, sender, 0)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" NOT to change by 0, but it did/
          );
        });

        it("changes balance doesn't have to satisfy the predicate, but it did", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.not.changeTokenBalance(
              mockToken,
              sender,
              (diff: bigint) => diff < BigInt(1)
            )
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to NOT satisfy the predicate, but it did \(change by: 0 wei\)/
          );
        });

        it("the first account doesn't change its balance as expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.changeTokenBalances(mockToken, [sender, receiver], [1, 0])
          ).to.be.rejectedWith(AssertionError);
        });

        it("the second account doesn't change its balance as expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.changeTokenBalances(mockToken, [sender, receiver], [0, 1])
          ).to.be.rejectedWith(AssertionError);
        });

        it("neither account changes its balance as expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.changeTokenBalances(mockToken, [sender, receiver], [1, 1])
          ).to.be.rejectedWith(AssertionError);
        });

        it("accounts change their balance in the way it was not expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.not.changeTokenBalances(mockToken, [sender, receiver], [0, 0])
          ).to.be.rejectedWith(AssertionError);
        });
      });
    });

    describe("Transaction Callback", function () {
      it("Should pass when given predicate", async () => {
        await expect(() =>
          mockToken.transfer(receiver.address, 75)
        ).to.changeTokenBalances(
          mockToken,
          [sender, receiver],
          ([senderDiff, receiverDiff]: bigint[]) => {
            return senderDiff === BigInt(-75) && receiverDiff === BigInt(75);
          }
        );
      });

      it("Should fail when the predicate returns false", async () => {
        await expect(
          expect(
            mockToken.transfer(receiver.address, 75)
          ).to.changeTokenBalances(
            mockToken,
            [sender, receiver],
            ([senderDiff, receiverDiff]: bigint[]) => {
              return senderDiff === BigInt(-74) && receiverDiff === BigInt(75);
            }
          )
        ).to.be.eventually.rejectedWith(
          AssertionError,
          "Expected the balance changes of MCK to satisfy the predicate, but they didn't"
        );
      });

      it("Should fail when the predicate returns true and the assertion is negated", async () => {
        await expect(
          expect(
            mockToken.transfer(receiver.address, 75)
          ).to.not.changeTokenBalances(
            mockToken,
            [sender, receiver],
            ([senderDiff, receiverDiff]: bigint[]) => {
              return senderDiff === BigInt(-75) && receiverDiff === BigInt(75);
            }
          )
        ).to.be.eventually.rejectedWith(
          AssertionError,
          "Expected the balance changes of MCK to NOT satisfy the predicate, but they did"
        );
      });
    });

    describe("transaction that transfers some tokens", function () {
      it("with a promise of a TxResponse", async function () {
        await runAllAsserts(
          mockToken.transfer(receiver.address, 50),
          mockToken,
          [sender, receiver],
          [-50, 50]
        );

        await runAllAsserts(
          mockToken.transfer(receiver.address, 100),
          mockToken,
          [sender, receiver],
          [-100, 100]
        );
      });

      it("with a TxResponse", async function () {
        await runAllAsserts(
          await mockToken.transfer(receiver.address, 150),
          mockToken,
          [sender, receiver],
          [-150, 150]
        );
      });

      it("with a function that returns a promise of a TxResponse", async function () {
        await runAllAsserts(
          () => mockToken.transfer(receiver.address, 200),
          mockToken,
          [sender, receiver],
          [-200, 200]
        );
      });

      it("with a function that returns a TxResponse", async function () {
        const txResponse = await mockToken.transfer(receiver.address, 300);
        await runAllAsserts(
          () => txResponse,
          mockToken,
          [sender, receiver],
          [-300, 300]
        );
      });

      it("changeTokenBalance shouldn't run the transaction twice", async function () {
        const receiverBalanceBefore = await mockToken.balanceOf(
          receiver.address
        );

        await expect(() =>
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalance(mockToken, receiver, 50);

        const receiverBalanceChange =
          (await mockToken.balanceOf(receiver.address)) - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(50n);
      });

      it("changeTokenBalances shouldn't run the transaction twice", async function () {
        const receiverBalanceBefore = await mockToken.balanceOf(
          receiver.address
        );

        await expect(() =>
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalances(mockToken, [sender, receiver], [-50, 50]);

        const receiverBalanceChange =
          (await mockToken.balanceOf(receiver.address)) - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(50n);
      });

      it("negated", async function () {
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.not.changeTokenBalance(mockToken, sender, 0);
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.not.changeTokenBalance(mockToken, sender, 1);

        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [0, 0]);
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [-50, 0]);
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.not.changeTokenBalances(mockToken, [sender, receiver], [0, 50]);
      });

      describe("assertion failures", function () {
        it("doesn't change balance as expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalance(mockToken, receiver, 500)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to change by 500, but it changed by 50/
          );
        });

        it("change balance doesn't satisfies the predicate", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalance(
              mockToken,
              receiver,
              (diff: bigint) => diff === BigInt(500)
            )
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to satisfy the predicate, but it didn't \(change by: 50 wei\)/
          );
        });

        it("changes balance in the way it was not expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(mockToken, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" NOT to change by 50, but it did/
          );
        });

        it("changes balance doesn't have to satisfy the predicate, but it did", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(
              mockToken,
              receiver,
              (diff: bigint) => diff === BigInt(50)
            )
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MCK tokens for "0x\w{40}" to NOT satisfy the predicate, but it did \(change by: 50 wei\)/
          );
        });

        it("the first account doesn't change its balance as expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(mockToken, [sender, receiver], [-100, 50])
          ).to.be.rejectedWith(AssertionError);
        });

        it("the second account doesn't change its balance as expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(mockToken, [sender, receiver], [-50, 100])
          ).to.be.rejectedWith(AssertionError);
        });

        it("neither account changes its balance as expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(mockToken, [sender, receiver], [0, 0])
          ).to.be.rejectedWith(AssertionError);
        });

        it("accounts change their balance in the way it was not expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.not.changeTokenBalances(
              mockToken,
              [sender, receiver],
              [-50, 50]
            )
          ).to.be.rejectedWith(AssertionError);
        });

        it("uses the token name if the contract doesn't have a symbol", async function () {
          const TokenWithOnlyName = await this.hre.ethers.getContractFactory<
            [],
            Token
          >("TokenWithOnlyName");
          const tokenWithOnlyName = await TokenWithOnlyName.deploy();

          await expect(
            expect(
              tokenWithOnlyName.transfer(receiver.address, 50)
            ).to.changeTokenBalance(tokenWithOnlyName, receiver, 500)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MockToken tokens for "0x\w{40}" to change by 500, but it changed by 50/
          );

          await expect(
            expect(
              tokenWithOnlyName.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(tokenWithOnlyName, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of MockToken tokens for "0x\w{40}" NOT to change by 50, but it did/
          );
        });

        it("uses the contract address if the contract doesn't have name or symbol", async function () {
          const TokenWithoutNameNorSymbol =
            await this.hre.ethers.getContractFactory<[], Token>(
              "TokenWithoutNameNorSymbol"
            );
          const tokenWithoutNameNorSymbol =
            await TokenWithoutNameNorSymbol.deploy();

          await expect(
            expect(
              tokenWithoutNameNorSymbol.transfer(receiver.address, 50)
            ).to.changeTokenBalance(tokenWithoutNameNorSymbol, receiver, 500)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of <token at 0x\w{40}> tokens for "0x\w{40}" to change by 500, but it changed by 50/
          );

          await expect(
            expect(
              tokenWithoutNameNorSymbol.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(tokenWithoutNameNorSymbol, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected the balance of <token at 0x\w{40}> tokens for "0x\w{40}" NOT to change by 50, but it did/
          );
        });

        it("changeTokenBalance: Should throw if chained to another non-chainable method", () => {
          expect(() =>
            expect(mockToken.transfer(receiver.address, 50))
              .to.emit(mockToken, "SomeEvent")
              .and.to.changeTokenBalance(mockToken, receiver, 50)
          ).to.throw(
            /The matcher 'changeTokenBalance' cannot be chained after 'emit'./
          );
        });

        it("changeTokenBalances: should throw if chained to another non-chainable method", () => {
          expect(() =>
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.be.reverted.and.to.changeTokenBalances(
              mockToken,
              [sender, receiver],
              [-50, 100]
            )
          ).to.throw(
            /The matcher 'changeTokenBalances' cannot be chained after 'reverted'./
          );
        });
      });
    });

    describe("validation errors", function () {
      describe(CHANGE_TOKEN_BALANCE_MATCHER, function () {
        it("token is not specified", async function () {
          expect(() =>
            expect(mockToken.transfer(receiver.address, 50))
              .to // @ts-expect-error
              .changeTokenBalance(receiver, 50)
          ).to.throw(
            Error,
            "The first argument of changeTokenBalance must be the contract instance of the token"
          );

          // if an address is used
          expect(() =>
            expect(mockToken.transfer(receiver.address, 50))
              .to // @ts-expect-error
              .changeTokenBalance(receiver.address, 50)
          ).to.throw(
            Error,
            "The first argument of changeTokenBalance must be the contract instance of the token"
          );
        });

        it("contract is not a token", async function () {
          const NotAToken = await this.hre.ethers.getContractFactory(
            "NotAToken"
          );
          const notAToken = await NotAToken.deploy();

          expect(() =>
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalance(notAToken, sender, -50)
          ).to.throw(
            Error,
            "The given contract instance is not an ERC20 token"
          );
        });

        it("tx is not the only one in the block", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          // we set a gas limit to avoid using the whole block gas limit
          await sender.sendTransaction({
            to: receiver.address,
            gasLimit: 30_000,
          });

          await this.hre.network.provider.send("evm_setAutomine", [true]);

          await expect(
            expect(
              mockToken.transfer(receiver.address, 50, { gasLimit: 100_000 })
            ).to.changeTokenBalance(mockToken, sender, -50)
          ).to.be.rejectedWith(Error, "Multiple transactions found in block");
        });

        it("tx reverts", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 0)
            ).to.changeTokenBalance(mockToken, sender, -50)
          ).to.be.rejectedWith(
            Error,
            // check that the error message includes the revert reason
            "Transferred value is zero"
          );
        });
      });

      describe(CHANGE_TOKEN_BALANCES_MATCHER, function () {
        it("token is not specified", async function () {
          expect(() =>
            expect(mockToken.transfer(receiver.address, 50))
              .to // @ts-expect-error
              .changeTokenBalances([sender, receiver], [-50, 50])
          ).to.throw(
            Error,
            "The first argument of changeTokenBalances must be the contract instance of the token"
          );
        });

        it("contract is not a token", async function () {
          const NotAToken = await this.hre.ethers.getContractFactory(
            "NotAToken"
          );
          const notAToken = await NotAToken.deploy();

          expect(() =>
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(notAToken, [sender, receiver], [-50, 50])
          ).to.throw(
            Error,
            "The given contract instance is not an ERC20 token"
          );
        });

        it("arrays have different length", async function () {
          expect(() =>
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(mockToken, [sender], [-50, 50])
          ).to.throw(
            Error,
            "The number of accounts (1) is different than the number of expected balance changes (2)"
          );

          expect(() =>
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(mockToken, [sender, receiver], [-50])
          ).to.throw(
            Error,
            "The number of accounts (2) is different than the number of expected balance changes (1)"
          );
        });

        it("arrays have different length, subject is a rejected promise", async function () {
          expect(() =>
            expect(matchers.revertsWithoutReason()).to.changeTokenBalances(
              mockToken,
              [sender],
              [-50, 50]
            )
          ).to.throw(
            Error,
            "The number of accounts (1) is different than the number of expected balance changes (2)"
          );
        });

        it("tx is not the only one in the block", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          // we set a gas limit to avoid using the whole block gas limit
          await sender.sendTransaction({
            to: receiver.address,
            gasLimit: 30_000,
          });

          await this.hre.network.provider.send("evm_setAutomine", [true]);

          await expect(
            expect(
              mockToken.transfer(receiver.address, 50, { gasLimit: 100_000 })
            ).to.changeTokenBalances(mockToken, [sender, receiver], [-50, 50])
          ).to.be.rejectedWith(Error, "Multiple transactions found in block");
        });

        it("tx reverts", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 0)
            ).to.changeTokenBalances(mockToken, [sender, receiver], [-50, 50])
          ).to.be.rejectedWith(
            Error,
            // check that the error message includes the revert reason
            "Transferred value is zero"
          );
        });
      });
    });

    describe("accepted number types", function () {
      it("native bigints are accepted", async function () {
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalance(mockToken, sender, BigInt(-50));

        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalances(
          mockToken,
          [sender, receiver],
          [BigInt(-50), BigInt(50)]
        );
      });
    });

    // smoke tests for stack traces
    describe("stack traces", function () {
      describe(CHANGE_TOKEN_BALANCE_MATCHER, function () {
        it("includes test file", async function () {
          let hasProperStackTrace = false;
          try {
            await expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalance(mockToken, sender, -100);
          } catch (e: any) {
            hasProperStackTrace = util
              .inspect(e)
              .includes(path.join("test", "changeTokenBalance.ts"));
          }

          expect(hasProperStackTrace).to.equal(true);
        });
      });

      describe(CHANGE_TOKEN_BALANCES_MATCHER, function () {
        it("includes test file", async function () {
          try {
            await expect(
              mockToken.transfer(receiver.address, 50)
            ).to.changeTokenBalances(
              mockToken,
              [sender, receiver],
              [-100, 100]
            );
          } catch (e: any) {
            expect(util.inspect(e)).to.include(
              path.join("test", "changeTokenBalance.ts")
            );

            return;
          }

          expect.fail("Expected an exception but none was thrown");
        });
      });
    });
  }
});

function zip<T, U>(a: T[], b: U[]): Array<[T, U]> {
  assert(a.length === b.length);

  return a.map((x, i) => [x, b[i]]);
}

/**
 * Given an expression `expr`, a token, and a pair of arrays, check that
 * `changeTokenBalance` and `changeTokenBalances` behave correctly in different
 * scenarios.
 */
async function runAllAsserts(
  expr:
    | TransactionResponse
    | Promise<TransactionResponse>
    | (() => TransactionResponse)
    | (() => Promise<TransactionResponse>),
  token: Token,
  accounts: Array<string | HardhatEthersSigner>,
  balances: Array<number | bigint>
) {
  // changeTokenBalances works for the given arrays
  await expect(expr).to.changeTokenBalances(token, accounts, balances);

  // changeTokenBalances works for empty arrays
  await expect(expr).to.changeTokenBalances(token, [], []);

  // for each given pair of account and balance, check that changeTokenBalance
  // works correctly
  for (const [account, balance] of zip(accounts, balances)) {
    await expect(expr).to.changeTokenBalance(token, account, balance);
  }
}
