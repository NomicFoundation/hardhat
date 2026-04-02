import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";

// We use declare global instead of declare module "chai", because that's what
// @types/chai does.
declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace -- We have to use
  a namespace because @types/chai uses it. */
  namespace Chai {
    interface Assertion
      extends LanguageChains,
        NumericComparison,
        TypeComparison {
      /**
       * Assert that a transaction emits a specific event.
       * @param contract The contract that emits the event.
       * @param eventName The name of the event to check for.
       * @returns An EmitAssertion that can be chained with `.withArgs`.
       * @example
       * await expect(token.transfer(address, 100))
       *   .to.emit(token, "Transfer")
       *   .withArgs(100);
       */
      emit(contract: any, eventName: string): EmitAssertion;

      /**
       * @deprecated This matcher is deprecated in favor of `.revert`.
       */
      reverted: AsyncAssertion;

      /**
       * Assert that a transaction reverted for any reason.
       * Replaces `.reverted` in Hardhat v3 and requires the `ethers` instance.
       * @param ethers The Hardhat ethers instance used in the test.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(address, 0)).to.revert(ethers);
       */
      revert(ethers: HardhatEthers): AsyncAssertion;

      /**
       * Assert that a transaction reverted with a specific reason string or matching regex.
       * @param reason The expected revert reason or regex pattern.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(address, 0)).to.be.revertedWith(
       *   "transfer value must be positive",
       * );
       */
      revertedWith(reason: string | RegExp): AsyncAssertion;

      /**
       * Assert that a transaction reverted without returning any reason string,
       * custom error, or panic code.
       * @param ethers The Hardhat ethers instance used in the test.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(address, 0)).to.be.revertedWithoutReason(ethers);
       */
      revertedWithoutReason(ethers: HardhatEthers): AsyncAssertion;

      /**
       * Assert that a transaction reverted with a specific Solidity panic code.
       * @param code Optional panic code to check for.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(address, 0)).to.be.revertedWithPanic();
       * await expect(token.transfer(address, 0)).to.be.revertedWithPanic(0x12);
       */
      revertedWithPanic(code?: any): AsyncAssertion;

      /**
       * Assert that a transaction reverted with a specific custom error.
       * @param contract The contract that defines the custom error.
       * @param customErrorName The name of the expected custom error.
       * @returns A CustomErrorAssertion that can be chained with `.withArgs`.
       * @example
       * await expect(token.transfer(address, 0)).to.be.revertedWithCustomError(
       *  token,
       *  "InvalidTransferValue",
       * );
       */
      revertedWithCustomError(
        contract: { interface: any },
        customErrorName: string,
      ): CustomErrorAssertion;

      /**
       * Assert that two hexadecimal strings represent the same numerical value.
       * @param other The other hexadecimal string to compare.
       * @example
       * expect("0x00012AB").to.hexEqual("0x12ab");
       */
      hexEqual(other: string): void;

      /**
       * Assert that the given string is a valid private key.
       * @example
       * expect("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80").to
       * .be.properPrivateKey;
       */
      properPrivateKey: void;

      /**
       * Assert that the given string is a valid Ethereum address.
       * @example
       * expect("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266").to.be.properAddress;
       */
      properAddress: void;

      /**
       * Assert that the given string is a valid hexadecimal string of a specified length.
       * @param length The expected length of the hexadecimal string.
       * @example
       * expect("0x1234").to.be.properHex(4);
       */
      properHex(length: number): void;

      /**
       * Assert that the ether balance of an address changed by a specific amount.
       * @param ethers The Hardhat ethers instance used in the test.
       * @param account The account whose balance change will be checked.
       * @param balance The expected change in balance.
       * @param options Optional configuration, e.g., `{ includeFee: true }`.
       * @returns An AsyncAssertion.
       * @example
       * await expect(
       *  sender.sendTransaction({ to: receiver, value: 1000 }),
       * ).to.changeEtherBalance(ethers, sender, -1000);
       */
      changeEtherBalance(
        ethers: HardhatEthers,
        account: any,
        balance: any,
        options?: any,
      ): AsyncAssertion;

      /**
       * Assert that the ether balances of multiple addresses changed by specific amounts.
       * @param ethers The Hardhat ethers instance used in the test.
       * @param accounts The list of accounts to check.
       * @param balances The expected changes or a predicate function.
       * @param options Optional configuration, e.g., `{ includeFee: true }`.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(receiver, 1000)).to.changeTokenBalances(
       *  ethers,
       *  token,
       *  [sender, receiver],
       *  [-1000, 1000],
       * );
       */
      changeEtherBalances(
        ethers: HardhatEthers,
        accounts: any[],
        balances: any[] | ((changes: bigint[]) => boolean),
        options?: any,
      ): AsyncAssertion;

      /**
       * Assert that an ERC20 token balance of an address changed by a specific amount.
       * @param ethers The Hardhat ethers instance used in the test.
       * @param token The ERC20 token contract.
       * @param account The account whose token balance changed.
       * @param balance The expected balance change.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(receiver, 1000)).to.changeTokenBalance(
       *  ethers,
       *  token,
       *  sender,
       *  -1000,
       * );
       */
      changeTokenBalance(
        ethers: HardhatEthers,
        token: any,
        account: any,
        balance: any,
      ): AsyncAssertion;

      /**
       * Assert that ERC20 token balances of multiple addresses changed by specific amounts.
       * @param ethers The Hardhat ethers instance used in the test.
       * @param token The ERC20 token contract.
       * @param account The list of accounts to check.
       * @param balance The expected balance changes or a predicate function.
       * @returns An AsyncAssertion.
       * @example
       * await expect(token.transfer(receiver, 1000)).to.changeTokenBalances(
       *  ethers,
       *  token,
       *  [sender, receiver],
       *  [-1000, 1000],
       * );
       */
      changeTokenBalances(
        ethers: HardhatEthers,
        token: any,
        account: any[],
        balance: any[] | ((changes: bigint[]) => boolean),
      ): AsyncAssertion;
    }

    interface NumericComparison {
      within(start: any, finish: any, message?: string): Assertion;
    }

    interface NumberComparer {
      // eslint-disable-next-line -- the interface must follow the original definition pattern
      (value: any, message?: string): Assertion;
    }

    interface CloseTo {
      // eslint-disable-next-line -- the interface must follow the original definition pattern
      (expected: any, delta: any, message?: string): Assertion;
    }

    interface Length extends Assertion {
      (length: any, message?: string): Assertion;
    }

    interface AsyncAssertion extends Assertion, Promise<void> {}

    interface EmitAssertion extends AsyncAssertion {
      withArgs(...args: any[]): AsyncAssertion;
    }

    interface CustomErrorAssertion extends AsyncAssertion {
      withArgs(...args: any[]): AsyncAssertion;
    }
  }
}
