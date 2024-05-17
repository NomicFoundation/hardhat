import type {
  WalletClient,
  GetContractReturnType,
  erc20Abi,
  PublicClient,
} from "viem";

import { buildAssert } from "../utils";
import { ensure } from "./calledOnContract/utils";
import { getAddressOf } from "./misc/account";
import {
  CHANGE_TOKEN_BALANCES_MATCHER,
  CHANGE_TOKEN_BALANCE_MATCHER,
} from "./constants";
import {
  assertIsNotNull,
  getTransactionReceipt,
  preventAsyncMatcherChaining,
} from "./utils";

type TokenContract = GetContractReturnType<typeof erc20Abi, PublicClient>;

export function supportChangeTokenBalance(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    CHANGE_TOKEN_BALANCE_MATCHER,
    function (
      this: any,
      token: TokenContract,
      account: WalletClient | { address: `0x${string}` } | `0x${string}`,
      balanceChange: bigint | number | string
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      preventAsyncMatcherChaining(
        this,
        CHANGE_TOKEN_BALANCE_MATCHER,
        chaiUtils
      );

      checkToken(token, CHANGE_TOKEN_BALANCE_MATCHER);

      const checkBalanceChange = ([actualChange, address, tokenDescription]: [
        bigint,
        string,
        string
      ]) => {
        const assert = buildAssert(negated, checkBalanceChange);

        assert(
          actualChange === BigInt(balanceChange),
          `Expected the balance of ${tokenDescription} tokens for "${address}" to change by ${balanceChange.toString()}, but it changed by ${actualChange.toString()}`,
          `Expected the balance of ${tokenDescription} tokens for "${address}" NOT to change by ${balanceChange.toString()}, but it did`
        );
      };

      const derivedPromise = Promise.all([
        getBalanceChange(subject, token, account),
        getAddressOf(account),
        getTokenDescription(token),
      ]).then(checkBalanceChange);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );

  Assertion.addMethod(
    CHANGE_TOKEN_BALANCES_MATCHER,
    function (
      this: any,
      token: TokenContract,
      accounts: Array<
        WalletClient | { address: `0x${string}` } | `0x${string}`
      >,
      balanceChanges: Array<bigint | number | string>
    ) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      let subject = this._obj;
      if (typeof subject === "function") {
        subject = subject();
      }

      preventAsyncMatcherChaining(
        this,
        CHANGE_TOKEN_BALANCES_MATCHER,
        chaiUtils
      );

      validateInput(this._obj, token, accounts, balanceChanges);

      const balanceChangesPromise = Promise.all(
        accounts.map((account) => getBalanceChange(subject, token, account))
      );
      const addressesPromise = Promise.all(accounts.map(getAddressOf));

      const checkBalanceChanges = ([
        actualChanges,
        addresses,
        tokenDescription,
      ]: [bigint[], string[], string]) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        assert(
          actualChanges.every(
            (change, ind) => change === BigInt(balanceChanges[ind])
          ),
          `Expected the balances of ${tokenDescription} tokens for ${
            addresses as any
          } to change by ${
            balanceChanges as any
          }, respectively, but they changed by ${actualChanges as any}`,
          `Expected the balances of ${tokenDescription} tokens for ${
            addresses as any
          } NOT to change by ${
            balanceChanges as any
          }, respectively, but they did`
        );
      };

      const derivedPromise = Promise.all([
        balanceChangesPromise,
        addressesPromise,
        getTokenDescription(token),
      ]).then(checkBalanceChanges);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}

function validateInput(
  obj: any,
  token: TokenContract,
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>,
  balanceChanges: Array<bigint | number | string>
) {
  try {
    checkToken(token, CHANGE_TOKEN_BALANCES_MATCHER);

    if (accounts.length !== balanceChanges.length) {
      throw new Error(
        `The number of accounts (${accounts.length}) is different than the number of expected balance changes (${balanceChanges.length})`
      );
    }
  } catch (e) {
    // if the input validation fails, we discard the subject since it could
    // potentially be a rejected promise
    Promise.resolve(obj).catch(() => {});
    throw e;
  }
}

function checkToken(token: unknown, method: string) {
  if (typeof token !== "object" || token === null || !("abi" in token)) {
    throw new Error(
      `The first argument of ${method} must be the contract instance of the token`
    );
  } else if (typeof (token as any)?.read?.balanceOf !== "function") {
    throw new Error("The given contract instance is not an ERC20 token");
  }
}

export async function getBalanceChange(
  transaction: `0x${string}` | Promise<`0x${string}`>,
  token: TokenContract,
  account: WalletClient | { address: `0x${string}` } | `0x${string}`
) {
  const { viem } = await import("hardhat");
  const publicClient = await viem.getPublicClient();

  const hash = await transaction;
  const txReceipt = await getTransactionReceipt(hash);
  assertIsNotNull(txReceipt, "txReceipt");
  const txBlockNumber = txReceipt.blockNumber;
  const transactionCount = await publicClient.getBlockTransactionCount({
    blockHash: txReceipt.blockHash,
  });

  ensure(transactionCount === 1, Error, "Multiple transactions found in block");

  const address = await getAddressOf(account);

  const balanceAfter = await token.read.balanceOf([address], {
    blockNumber: txBlockNumber,
  });

  const balanceBefore = await token.read.balanceOf([address], {
    blockNumber: txBlockNumber - 1n,
  });

  return balanceAfter - balanceBefore;
}

let tokenDescriptionsCache: Record<string, string> = {};
/**
 * Get a description for the given token. Use the symbol of the token if
 * possible; if it doesn't exist, the name is used; if the name doesn't
 * exist, the address of the token is used.
 */
async function getTokenDescription(token: TokenContract): Promise<string> {
  const tokenAddress = token.address;
  if (tokenDescriptionsCache[tokenAddress] === undefined) {
    let tokenDescription = `<token at ${tokenAddress}>`;
    try {
      tokenDescription = await token.read.symbol();
    } catch (e) {
      try {
        tokenDescription = await token.read.name();
      } catch (e2) {}
    }

    tokenDescriptionsCache[tokenAddress] = tokenDescription;
  }

  return tokenDescriptionsCache[tokenAddress];
}

// only used by tests
export function clearTokenDescriptionsCache() {
  tokenDescriptionsCache = {};
}
