/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-use-before-define */
/// <reference types="chai" />
// I cannot get ethers types to work for some reason

declare namespace Chai {
  interface Assertion
    extends LanguageChains,
      NumericComparison,
      TypeComparison {
    reverted: AsyncAssertion;
    revertedWith(reason: string): AsyncAssertion;
    emit(contract: any, eventName: string): EmitAssertion;
    properHex(length: number): void;
    hexEqual(other: string): void;
    properPrivateKey: void;
    properAddress: void;
    /**
     * @deprecated Use `changeEtherBalance()` instead.
     */
    changeBalance(account: any, balance: any): AsyncAssertion;
    /**
     * @deprecated Use `changeEtherBalances()` instead.
     */
    changeBalances(accounts: any[], balances: any[]): AsyncAssertion;
    changeEtherBalance(
      account: any,
      balance: any,
      options?: any
    ): AsyncAssertion;
    changeEtherBalances(
      accounts: any[],
      balances: any[],
      options?: any
    ): AsyncAssertion;
    changeTokenBalance(token: any, account: any, balance: any): AsyncAssertion;
    changeTokenBalances(
      token: any,
      accounts: any[],
      balances: any[]
    ): AsyncAssertion;
    calledOnContract(contract: any): void;
    calledOnContractWith(contract: any, parameters: any[]): void;
  }

  interface NumericComparison {
    within(start: any, finish: any, message?: string): Assertion;
  }

  type NumberComparer = (value: any, message?: string) => Assertion;

  type CloseTo = (expected: any, delta: any, message?: string) => Assertion;

  interface AsyncAssertion extends Assertion, Promise<void> {}

  interface EmitAssertion extends AsyncAssertion {
    withArgs(...args: any[]): AsyncAssertion;
  }
}
