import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { EthereumProvider } from "hardhat/types/providers";

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
      emit(contract: any, eventName: string): EmitAssertion;
      revert(ethers: HardhatEthers): AsyncAssertion;
      revertedWith(reason: string | RegExp): AsyncAssertion;
      revertedWithoutReason(ethers: HardhatEthers): AsyncAssertion;
      revertedWithPanic(code?: any): AsyncAssertion;
      revertedWithCustomError(
        contract: { interface: any },
        customErrorName: string,
      ): CustomErrorAssertion;
      hexEqual(other: string): void;
      properPrivateKey: void;
      properAddress: void;
      properHex(length: number): void;
      changeEtherBalance(
        provider: EthereumProvider,
        account: any,
        balance: any,
        options?: any,
      ): AsyncAssertion;
      changeEtherBalances(
        provider: EthereumProvider,
        accounts: any[],
        balances: any[] | ((changes: bigint[]) => boolean),
        options?: any,
      ): AsyncAssertion;
      changeTokenBalance(
        provider: EthereumProvider,
        token: any,
        account: any,
        balance: any,
      ): AsyncAssertion;
      changeTokenBalances(
        provider: EthereumProvider,
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
