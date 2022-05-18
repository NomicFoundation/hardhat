import type EthersT from "ethers";

import { ensure } from "./calledOnContract/utils";
import { Account, getAddressOf } from "./misc/account";

type TransactionResponse = EthersT.providers.TransactionResponse;

interface Token extends EthersT.Contract {
  balanceOf(address: string, overrides?: any): Promise<EthersT.BigNumber>;
}

export function supportChangeTokenBalance(Assertion: Chai.AssertionStatic) {
  Assertion.addMethod(
    "changeTokenBalance",
    function (
      this: any,
      token: Token,
      account: Account | string,
      balanceChange: EthersT.BigNumberish
    ) {
      const ethers = require("ethers") as typeof EthersT;
      const subject = this._obj;

      checkToken(token, "changeTokenBalance");

      const derivedPromise = Promise.all([
        getBalanceChange(subject, token, account),
        getAddressOf(account),
        getTokenDescription(token),
      ]).then(([actualChange, address, tokenDescription]) => {
        this.assert(
          actualChange.eq(ethers.BigNumber.from(balanceChange)),
          `Expected "${address}" to change its balance of ${tokenDescription} by ${balanceChange.toString()}, ` +
            `but it has changed by ${actualChange.toString()}`,
          `Expected "${address}" to not change its balance of ${tokenDescription} by ${balanceChange.toString()}, but it did`,
          balanceChange,
          actualChange
        );
      });

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );

  Assertion.addMethod(
    "changeTokenBalances",
    function (
      this: any,
      token: Token,
      accounts: Array<Account | string>,
      balanceChanges: EthersT.BigNumberish[]
    ) {
      const ethers = require("ethers") as typeof EthersT;
      const subject = this._obj;

      checkToken(token, "changeTokenBalances");

      if (accounts.length !== balanceChanges.length) {
        throw new Error(
          `The number of accounts (${accounts.length}) is different than the number of expected balance changes (${balanceChanges.length})`
        );
      }

      const balanceChangesPromise = Promise.all(
        accounts.map((account) => getBalanceChange(subject, token, account))
      );
      const addressesPromise = Promise.all(accounts.map(getAddressOf));

      const derivedPromise = Promise.all([
        balanceChangesPromise,
        addressesPromise,
        getTokenDescription(token),
      ]).then(([actualChanges, addresses, tokenDescription]) => {
        this.assert(
          actualChanges.every((change, ind) =>
            change.eq(ethers.BigNumber.from(balanceChanges[ind]))
          ),
          `Expected ${
            addresses as any
          } to change their balance of ${tokenDescription} by ${
            balanceChanges as any
          }, ` + `but it has changed by ${actualChanges as any}`,
          `Expected ${
            addresses as any
          } to not change their balance of ${tokenDescription} by ${
            balanceChanges as any
          }, but they did`,
          balanceChanges.map((balanceChange) => balanceChange.toString()),
          actualChanges.map((actualChange) => actualChange.toString())
        );
      });

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}

function checkToken(token: unknown, method: string) {
  if (typeof token !== "object" || token === null || !("functions" in token)) {
    throw new Error(
      `The first argument of ${method} must be the contract instance of the token`
    );
  } else if ((token as any).functions.balanceOf === undefined) {
    throw new Error("The given contract instance is not an ERC20 token");
  }
}

export async function getBalanceChange(
  transaction:
    | TransactionResponse
    | Promise<TransactionResponse>
    | (() => TransactionResponse)
    | (() => Promise<TransactionResponse>),
  token: Token,
  account: Account | string
) {
  const ethers = require("ethers") as typeof EthersT;
  const hre = await import("hardhat");
  const provider = hre.network.provider;

  let txResponse: TransactionResponse;

  if (typeof transaction === "function") {
    txResponse = await transaction();
  } else {
    txResponse = await transaction;
  }

  const txReceipt = await txResponse.wait();
  const txBlockNumber = txReceipt.blockNumber;

  const block = await provider.send("eth_getBlockByHash", [
    txReceipt.blockHash,
    false,
  ]);

  ensure(
    block.transactions.length === 1,
    Error,
    "Multiple transactions found in block"
  );

  const address = await getAddressOf(account);

  const balanceAfter = await token.balanceOf(address, {
    blockTag: txBlockNumber,
  });

  const balanceBefore = await token.balanceOf(address, {
    blockTag: txBlockNumber - 1,
  });

  return ethers.BigNumber.from(balanceAfter).sub(balanceBefore);
}

let tokenDescriptionsCache: Record<string, string> = {};
/**
 * Get a description for the given token. Use the symbol of the token if
 * possible; if it doesn't exist, the name is used; if the name doesn't
 * exist, the address of the token is used.
 */
async function getTokenDescription(token: Token): Promise<string> {
  if (tokenDescriptionsCache[token.address] === undefined) {
    let tokenDescription = `<token at ${token.address}>`;
    try {
      tokenDescription = await token.symbol();
    } catch (e) {
      try {
        tokenDescription = await token.name();
      } catch (e2) {}
    }

    tokenDescriptionsCache[token.address] = tokenDescription;
  }

  return tokenDescriptionsCache[token.address];
}

// only used by tests
export function clearTokenDescriptionsCache() {
  tokenDescriptionsCache = {};
}
