import type { EthereumProvider } from "hardhat/types/providers";
import type {
  Addressable,
  BaseContract,
  BaseContractMethod,
  BigNumberish,
  ContractTransactionResponse,
} from "ethers";
import type { TransactionResponse } from "ethers/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { toBigInt } from "ethers/utils";

import {
  CHANGE_TOKEN_BALANCES_MATCHER,
  CHANGE_TOKEN_BALANCE_MATCHER,
} from "../constants.js";
import { getAddressOf } from "../utils/account.js";
import { assertIsNotNull } from "../utils/asserts.js";
import { buildAssert } from "../utils/build-assert.js";
import { preventAsyncMatcherChaining } from "../utils/prevent-chaining.js";

export type Token = BaseContract & {
  balanceOf: BaseContractMethod<[string], bigint, bigint>;
  name: BaseContractMethod<[], string, string>;
  transfer: BaseContractMethod<
    [string, BigNumberish],
    boolean,
    ContractTransactionResponse
  >;
  symbol: BaseContractMethod<[], string, string>;
};

export function supportChangeTokenBalance(
  Assertion: Chai.AssertionStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  Assertion.addMethod(
    CHANGE_TOKEN_BALANCE_MATCHER,
    function (
      this: any,
      provider: EthereumProvider,
      token: Token,
      account: Addressable | string,
      balanceChange: bigint | ((change: bigint) => boolean),
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
        chaiUtils,
      );

      checkToken(token, CHANGE_TOKEN_BALANCE_MATCHER);

      const checkBalanceChange = ([actualChange, address, tokenDescription]: [
        bigint,
        string,
        string,
      ]) => {
        const assert = buildAssert(negated, checkBalanceChange);

        if (typeof balanceChange === "function") {
          assert(
            balanceChange(actualChange),
            `Expected the balance of ${tokenDescription} tokens for "${address}" to satisfy the predicate, but it didn't (token balance change: ${actualChange.toString()} wei)`,
            `Expected the balance of ${tokenDescription} tokens for "${address}" to NOT satisfy the predicate, but it did (token balance change: ${actualChange.toString()} wei)`,
          );
        } else {
          assert(
            actualChange === toBigInt(balanceChange),
            `Expected the balance of ${tokenDescription} tokens for "${address}" to change by ${balanceChange.toString()}, but it changed by ${actualChange.toString()}`,
            `Expected the balance of ${tokenDescription} tokens for "${address}" NOT to change by ${balanceChange.toString()}, but it did`,
          );
        }
      };

      const derivedPromise = Promise.all([
        getBalanceChange(provider, subject, token, account),
        getAddressOf(account),
        getTokenDescription(token),
      ]).then(checkBalanceChange);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    },
  );

  Assertion.addMethod(
    CHANGE_TOKEN_BALANCES_MATCHER,
    function (
      this: any,
      provider: EthereumProvider,
      token: Token,
      accounts: Array<Addressable | string>,
      balanceChanges: bigint[] | ((changes: bigint[]) => boolean),
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
        chaiUtils,
      );

      validateInput(this._obj, token, accounts, balanceChanges);

      const balanceChangesPromise = Promise.all(
        accounts.map((account) =>
          getBalanceChange(provider, subject, token, account),
        ),
      );
      const addressesPromise = Promise.all(accounts.map(getAddressOf));

      const checkBalanceChanges = ([
        actualChanges,
        addresses,
        tokenDescription,
      ]: [bigint[], string[], string]) => {
        const assert = buildAssert(negated, checkBalanceChanges);

        if (typeof balanceChanges === "function") {
          assert(
            balanceChanges(actualChanges),
            `Expected the balance changes of ${tokenDescription} to satisfy the predicate, but they didn't`,
            `Expected the balance changes of ${tokenDescription} to NOT satisfy the predicate, but they did`,
          );
        } else {
          assert(
            actualChanges.every(
              (change, ind) => change === toBigInt(balanceChanges[ind]),
            ),
            `Expected the balances of ${tokenDescription} tokens for ${addresses.join(
              ", ",
            )} to change by ${balanceChanges.join(
              ", ",
            )}, respectively, but they changed by ${actualChanges.join(", ")}`,
            `Expected the balances of ${tokenDescription} tokens for ${addresses.join(
              ", ",
            )} NOT to change by ${balanceChanges.join(
              ", ",
            )}, respectively, but they did`,
          );
        }
      };

      const derivedPromise = Promise.all([
        balanceChangesPromise,
        addressesPromise,
        getTokenDescription(token),
      ]).then(checkBalanceChanges);

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    },
  );
}

function validateInput(
  obj: any,
  token: Token,
  accounts: Array<Addressable | string>,
  balanceChanges: bigint[] | ((changes: bigint[]) => boolean),
) {
  try {
    checkToken(token, CHANGE_TOKEN_BALANCES_MATCHER);

    if (
      Array.isArray(balanceChanges) &&
      accounts.length !== balanceChanges.length
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CHAI_MATCHERS.ACCOUNTS_NUMBER_DIFFERENT_FROM_BALANCE_CHANGES,
        {
          accounts: accounts.length,
          balanceChanges: balanceChanges.length,
        },
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
  if (!isObject(token) || token === null || !("interface" in token)) {
    throw new HardhatError(
      HardhatError.ERRORS.CHAI_MATCHERS.FIRST_ARGUMENT_MUST_BE_A_CONTRACT_INSTANCE,
      {
        method,
      },
    );
  } else if (
    isObject(token) &&
    "interface" in token &&
    isObject(token.interface) &&
    "getFunction" in token.interface &&
    typeof token.interface.getFunction === "function" &&
    token.interface.getFunction("balanceOf") === null
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.CHAI_MATCHERS.CONTRACT_IS_NOT_AN_ERC20_TOKEN,
    );
  }
}

export async function getBalanceChange(
  provider: EthereumProvider,
  transaction: TransactionResponse | Promise<TransactionResponse>,
  token: Token,
  account: Addressable | string,
): Promise<bigint> {
  const txResponse = await transaction;

  const txReceipt = await txResponse.wait();
  assertIsNotNull(txReceipt, "txReceipt");
  const txBlockNumber = txReceipt.blockNumber;

  const block = await provider.request({
    method: "eth_getBlockByHash",
    params: [txReceipt.blockHash, false],
  });

  assertHardhatInvariant(
    isObject(block) &&
      Array.isArray(block.transactions) &&
      block.transactions.length === 1,
    "There should be only 1 transaction in the block",
  );

  const address = await getAddressOf(account);

  const balanceAfter = await token.balanceOf(address, {
    blockTag: txBlockNumber,
  });

  const balanceBefore = await token.balanceOf(address, {
    blockTag: txBlockNumber - 1,
  });

  return toBigInt(balanceAfter) - balanceBefore;
}

let tokenDescriptionsCache: Record<string, string> = {};
/**
 * Get a description for the given token. Use the symbol of the token if
 * possible; if it doesn't exist, the name is used; if the name doesn't
 * exist, the address of the token is used.
 */
async function getTokenDescription(token: Token): Promise<string> {
  const tokenAddress = await token.getAddress();
  if (tokenDescriptionsCache[tokenAddress] === undefined) {
    let tokenDescription = `<token at ${tokenAddress}>`;
    try {
      tokenDescription = await token.symbol();
    } catch (e) {
      try {
        tokenDescription = await token.name();
      } catch (e2) {}
    }

    tokenDescriptionsCache[tokenAddress] = tokenDescription;
  }

  return tokenDescriptionsCache[tokenAddress];
}

// only used by tests
export function clearTokenDescriptionsCache(): void {
  tokenDescriptionsCache = {};
}
