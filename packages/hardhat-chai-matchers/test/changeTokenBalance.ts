import assert from "assert";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AssertionError, expect } from "chai";
import { BigNumber, Contract, providers } from "ethers";

import "../src";
import { clearTokenDescriptionsCache } from "../src/changeTokenBalance";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

type TransactionResponse = providers.TransactionResponse;

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
    let sender: SignerWithAddress;
    let receiver: SignerWithAddress;
    let mockToken: Contract;

    beforeEach(async function () {
      const wallets = await this.hre.ethers.getSigners();
      sender = wallets[0];
      receiver = wallets[1];

      const MockToken = await this.hre.ethers.getContractFactory("MockToken");
      mockToken = await MockToken.deploy();
    });

    describe("transaction that doesn't move tokens", () => {
      it("with a promise of a TxResponse", async function () {
        await runAllAsserts(
          sender.sendTransaction({ to: receiver.address }),
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
            /Expected "0x\w{40}" to change its balance of MCK by 1, but it has changed by 0/
          );
        });

        it("changes balance in the way it was not expected", async function () {
          await expect(
            expect(
              sender.sendTransaction({ to: receiver.address })
            ).to.not.changeTokenBalance(mockToken, sender, 0)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected "0x\w{40}" to not change its balance of MCK by 0, but it did/
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
            /Expected "0x\w{40}" to change its balance of MCK by 500, but it has changed by 50/
          );
        });

        it("changes balance in the way it was not expected", async function () {
          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(mockToken, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected "0x\w{40}" to not change its balance of MCK by 50, but it did/
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
          const TokenWithOnlyName = await this.hre.ethers.getContractFactory(
            "TokenWithOnlyName"
          );
          const tokenWithOnlyName = await TokenWithOnlyName.deploy();

          await expect(
            expect(
              tokenWithOnlyName.transfer(receiver.address, 50)
            ).to.changeTokenBalance(tokenWithOnlyName, receiver, 500)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected "0x\w{40}" to change its balance of MockToken by 500, but it has changed by 50/
          );

          await expect(
            expect(
              tokenWithOnlyName.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(tokenWithOnlyName, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected "0x\w{40}" to not change its balance of MockToken by 50, but it did/
          );
        });

        it("uses the contract address if the contract doesn't have name or symbol", async function () {
          const TokenWithoutNameNorSymbol =
            await this.hre.ethers.getContractFactory(
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
            /Expected "0x\w{40}" to change its balance of <token at 0x\w{40}> by 500, but it has changed by 50/
          );

          await expect(
            expect(
              tokenWithoutNameNorSymbol.transfer(receiver.address, 50)
            ).to.not.changeTokenBalance(tokenWithoutNameNorSymbol, receiver, 50)
          ).to.be.rejectedWith(
            AssertionError,
            /Expected "0x\w{40}" to not change its balance of <token at 0x\w{40}> by 50, but it did/
          );
        });
      });
    });

    describe("validation errors", function () {
      describe("changeTokenBalance", function () {
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

          await sender.sendTransaction({ to: receiver.address });

          await this.hre.network.provider.send("evm_setAutomine", [true]);

          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
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

      describe("changeTokenBalances", function () {
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

        it("tx is not the only one in the block", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          await sender.sendTransaction({ to: receiver.address });

          await this.hre.network.provider.send("evm_setAutomine", [true]);

          await expect(
            expect(
              mockToken.transfer(receiver.address, 50)
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

      it("ethers's bignumbers are accepted", async function () {
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalance(mockToken, sender, BigNumber.from(-50));

        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalances(
          mockToken,
          [sender, receiver],
          [BigNumber.from(-50), BigNumber.from(50)]
        );
      });

      it("mixed types are accepted", async function () {
        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalances(
          mockToken,
          [sender, receiver],
          [BigInt(-50), BigNumber.from(50)]
        );

        await expect(
          mockToken.transfer(receiver.address, 50)
        ).to.changeTokenBalances(
          mockToken,
          [sender, receiver],
          [BigNumber.from(-50), BigInt(50)]
        );
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
  token: Contract,
  accounts: Array<string | SignerWithAddress>,
  balances: Array<number | bigint | BigNumber>
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
